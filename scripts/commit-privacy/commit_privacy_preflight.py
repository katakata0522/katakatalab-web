#!/usr/bin/env python3
"""Local-only author/committer email preflight. Python 3.9+, standard library only."""

import argparse
import json
import os
from pathlib import Path
import re
import queue
import selectors
import subprocess
import sys
import tempfile
import threading
import time


MAX_INPUT_BYTES = 8 * 1024 * 1024
MAX_GIT_BYTES = 32 * 1024 * 1024
MAX_COMMITS = 10000
OID = re.compile(r"(?:[0-9a-f]{40}|[0-9a-f]{64})\Z")
NOREPLY_LOCAL = re.compile(r"(?:[0-9]+\+)?[a-z0-9][a-z0-9_-]*(?:\[bot\])?\Z", re.I)
LOCAL_PART = re.compile(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+\Z")
DOMAIN_LABEL = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\Z")
IDENTITY = re.compile(rb"(?:author|committer) [^<>\x00\r\n]* <([^<>\x00\r\n]*)> -?[0-9]+ [+-][0-9]{4}\Z")


class PreflightError(Exception):
    """Only fixed, non-sensitive error codes may be exposed to callers."""


class PrivateArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        # argparse normally repeats user-supplied arguments, which may be emails.
        raise PreflightError("invalid_arguments")


def canonical_email(value):
    """Conservative syntax check; never silently trim or repair metadata."""
    if not isinstance(value, str) or not value.isascii() or len(value) > 254:
        return None
    if value.count("@") != 1:
        return None
    local, domain = value.split("@")
    valid_local = LOCAL_PART.fullmatch(local) or (
        domain.lower() == "users.noreply.github.com" and NOREPLY_LOCAL.fullmatch(local))
    if not 1 <= len(local) <= 64 or not valid_local:
        return None
    if local.startswith(".") or local.endswith(".") or ".." in local:
        return None
    labels = domain.split(".")
    if len(labels) < 2 or not all(DOMAIN_LABEL.fullmatch(label) for label in labels):
        return None
    return local + "@" + domain.lower()


def is_github_noreply(value):
    address = canonical_email(value)
    if address is None:
        return False
    local, domain = address.split("@")
    if domain == "github.com":
        return local.lower() == "noreply"
    return domain == "users.noreply.github.com" and bool(NOREPLY_LOCAL.fullmatch(local))


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise PreflightError("duplicate_json_key")
        result[key] = value
    return result


def invalid_constant(value):
    raise PreflightError("invalid_json")


def load_json(stream):
    raw = stream.read(MAX_INPUT_BYTES + 1)
    if len(raw) > MAX_INPUT_BYTES:
        raise PreflightError("input_too_large")
    try:
        return json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object,
                          parse_constant=invalid_constant)
    except (ValueError, UnicodeError, RecursionError):
        raise PreflightError("invalid_json") from None


def load_json_file(path):
    try:
        # Only the path explicitly supplied by the caller is opened.
        with open(path, "rb") as stream:
            return load_json(stream)
    except OSError:
        raise PreflightError("input_unreadable") from None


def load_allowlist(path):
    if path is None:
        return set()
    values = load_json_file(path)
    if not isinstance(values, list) or len(values) > MAX_COMMITS:
        raise PreflightError("invalid_allowlist")
    allowed = set()
    for value in values:
        address = canonical_email(value)
        if address is None or "*" in address or "?" in address:
            raise PreflightError("invalid_allowlist")
        allowed.add(address)
    return allowed


def validate_records(records):
    if not isinstance(records, list) or not records or len(records) > MAX_COMMITS:
        raise PreflightError("invalid_record_count")
    required = {"author_email", "committer_email"}
    for record in records:
        if not isinstance(record, dict) or not required <= record.keys():
            raise PreflightError("invalid_metadata_structure")
        if record.keys() - required - {"oid"}:
            raise PreflightError("unexpected_metadata_field")
        if "oid" in record and (not isinstance(record["oid"], str)
                                or not OID.fullmatch(record["oid"])):
            raise PreflightError("invalid_commit_oid")
        if not all(isinstance(record[key], str) for key in required):
            raise PreflightError("invalid_metadata_structure")
    return records


def git_environment():
    # Do not inherit credentials, injected Git configuration, or .env contents.
    # Git still reads the explicitly selected repository's own configuration.
    environment = {
        "PATH": os.environ.get("PATH", os.defpath),
        "LC_ALL": "C",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_SYSTEM": os.devnull,
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_GRAFT_FILE": os.devnull,
        "GIT_ATTR_NOSYSTEM": "1",
    }
    # Windows needs these OS locations to start Git's child processes. They do
    # not carry Git configuration or credentials.
    if os.name == "nt":
        for key in ("SYSTEMROOT", "WINDIR", "TEMP", "TMP"):
            if key in os.environ:
                environment[key] = os.environ[key]
    return environment


def read_windows_pipe(process, deadline):
    # Windows selectors accept sockets, not anonymous subprocess pipes.
    # Keep a bounded queue and preserve the same size and time limits.
    chunks = queue.Queue(maxsize=16)
    stopped = threading.Event()

    def read():
        try:
            while not stopped.is_set():
                chunk = os.read(process.stdout.fileno(), 65536)
                while not stopped.is_set():
                    try:
                        chunks.put(chunk, timeout=0.1)
                        break
                    except queue.Full:
                        pass
                if not chunk:
                    return
        except OSError:
            while not stopped.is_set():
                try:
                    chunks.put(None, timeout=0.1)
                    return
                except queue.Full:
                    pass

    worker = threading.Thread(target=read, daemon=True)
    worker.start()
    output = bytearray()
    try:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise PreflightError("git_unavailable_or_timeout")
            try:
                chunk = chunks.get(timeout=remaining)
            except queue.Empty:
                raise PreflightError("git_unavailable_or_timeout") from None
            if chunk is None:
                raise PreflightError("git_read_failed")
            if not chunk:
                return output
            if len(output) + len(chunk) > MAX_GIT_BYTES:
                raise PreflightError("git_output_too_large")
            output.extend(chunk)
    finally:
        stopped.set()
        if worker.is_alive() and process.poll() is None:
            process.kill()
        worker.join(timeout=1)


def run_git(repo, args, input_data=None):
    # --no-lazy-fetch is REQUIRED, not just an environment-variable hint. Git
    # versions lacking this flag fail before accessing the repository. No fetch,
    # push, hooks, aliases, external diff drivers, or credential helpers are used.
    git_dir = repo / ".git" if (repo / ".git").exists() else repo
    command = ["git", "--no-pager", "--no-lazy-fetch", "--no-replace-objects",
               "-C", str(repo), "--git-dir=" + str(git_dir),
               "-c", "core.fsmonitor=false", "-c",
               "core.commitGraph=false", "-c", "protocol.allow=never",
               "-c", "credential.helper=", *args]
    try:
        # stdin contains only validated OIDs, never emails. Stream stdout into
        # bounded memory so oversized objects cannot fill disk or memory.
        with tempfile.TemporaryFile() as input_stream:
            if input_data is not None:
                input_stream.write(input_data)
            input_stream.seek(0)
            with subprocess.Popen(command, stdin=input_stream, stdout=subprocess.PIPE,
                                  stderr=subprocess.DEVNULL, env=git_environment()) as process:
                try:
                    deadline = time.monotonic() + 30
                    output = bytearray()
                    if os.name == "nt":
                        output = read_windows_pipe(process, deadline)
                    else:
                        with selectors.DefaultSelector() as selector:
                            selector.register(process.stdout, selectors.EVENT_READ)
                            while True:
                                remaining = deadline - time.monotonic()
                                if remaining <= 0 or not selector.select(remaining):
                                    raise PreflightError("git_unavailable_or_timeout")
                                chunk = os.read(process.stdout.fileno(),
                                                min(65536, MAX_GIT_BYTES - len(output) + 1))
                                if not chunk:
                                    break
                                output.extend(chunk)
                                if len(output) > MAX_GIT_BYTES:
                                    raise PreflightError("git_output_too_large")
                    process.wait(timeout=max(0, deadline - time.monotonic()))
                    if process.returncode != 0:
                        raise PreflightError("git_read_failed")
                    return bytes(output)
                finally:
                    if process.poll() is None:
                        process.kill()
                    process.wait()
    except (OSError, subprocess.TimeoutExpired):
        raise PreflightError("git_unavailable_or_timeout") from None


def parse_raw_commit(oid, raw):
    if b"\n\n" not in raw:
        raise PreflightError("malformed_commit_metadata")
    headers = raw.split(b"\n\n", 1)[0].split(b"\n")
    identities = {"oid": oid}
    previous_key = None
    for line in headers:
        if line.startswith(b" "):
            if previous_key in (b"author", b"committer"):
                raise PreflightError("malformed_commit_metadata")
            continue  # e.g. a multi-line gpgsig header
        key = line.split(b" ", 1)[0]
        previous_key = key
        if key not in (b"author", b"committer"):
            continue
        field = key.decode("ascii") + "_email"
        match = IDENTITY.fullmatch(line)
        if field in identities or match is None:
            raise PreflightError("malformed_commit_metadata")
        try:
            identities[field] = match.group(1).decode("utf-8")
        except UnicodeError:
            raise PreflightError("malformed_commit_metadata") from None
    if len(identities) != 3:
        raise PreflightError("malformed_commit_metadata")
    return identities


def parse_batch(data, oids):
    records = []
    offset = 0
    for expected_oid in oids:
        end = data.find(b"\n", offset)
        if end == -1:
            raise PreflightError("invalid_git_output")
        parts = data[offset:end].split(b" ")
        if (len(parts) != 3 or parts[0] != expected_oid.encode("ascii")
                or parts[1] != b"commit" or not parts[2].isdigit()):
            raise PreflightError("invalid_git_output")
        size = int(parts[2])
        offset = end + 1
        if offset + size >= len(data) or data[offset + size:offset + size + 1] != b"\n":
            raise PreflightError("invalid_git_output")
        records.append(parse_raw_commit(expected_oid, data[offset:offset + size]))
        offset += size + 1
    if offset != len(data):
        raise PreflightError("invalid_git_output")
    return records


def local_records(path, refs, exclude_refs=None):
    try:
        repo = Path(path).resolve(strict=True)
        # Require an explicit repository root or bare repository. Never search
        # parent directories and never discover refs via --all / remote calls.
        is_root = repo.is_dir() and (repo / ".git").exists()
        is_bare = (repo / "HEAD").is_file() and (repo / "objects").is_dir()
        if not (is_root or is_bare):
            raise PreflightError("explicit_repository_root_required")
    except OSError:
        raise PreflightError("repository_unreadable") from None
    if run_git(repo, ["rev-parse", "--is-shallow-repository"]).strip() != b"false":
        raise PreflightError("shallow_or_invalid_repository")
    tips = []
    exclusions = []
    exclude_refs = exclude_refs or []
    for index, ref in enumerate(refs + exclude_refs):
        if ref != "HEAD" and not OID.fullmatch(ref):
            if not ref.startswith("refs/"):
                raise PreflightError("explicit_local_ref_required")
            run_git(repo, ["check-ref-format", ref])
        raw_oid = run_git(repo, ["rev-parse", "--verify", "--end-of-options",
                                 ref + "^{commit}"]).strip()
        try:
            oid = raw_oid.decode("ascii")
        except UnicodeError:
            raise PreflightError("invalid_git_output") from None
        if not OID.fullmatch(oid):
            raise PreflightError("invalid_git_output")
        (tips if index < len(refs) else exclusions).append(oid)
    raw_oids = run_git(repo, ["rev-list", "--max-count=" + str(MAX_COMMITS + 1),
                               *tips, *(["--not", *exclusions] if exclusions else []), "--"])
    try:
        oids = raw_oids.decode("ascii").splitlines()
    except UnicodeError:
        raise PreflightError("invalid_git_output") from None
    if not oids and exclusions:
        return []
    if not oids or any(not OID.fullmatch(oid) for oid in oids):
        raise PreflightError("invalid_git_output")
    if len(oids) > MAX_COMMITS:
        raise PreflightError("too_many_commits")
    data = run_git(repo, ["cat-file", "--batch"],
                   ("\n".join(oids) + "\n").encode("ascii"))
    return validate_records(parse_batch(data, oids))


def inspect_records(records, allowlist):
    violations = []
    for index, record in enumerate(records, 1):
        for role in ("author", "committer"):
            address = canonical_email(record[role + "_email"])
            reason = None
            if address is None:
                reason = "invalid_email"
            elif not is_github_noreply(address) and address not in allowlist:
                reason = "email_not_allowed"
            if reason:
                violation = {"record": index, "role": role, "reason": reason}
                if "oid" in record:
                    violation["oid"] = record["oid"]
                violations.append(violation)
    return {"status": "fail" if violations else "pass",
            "checked_commits": len(records), "violations": violations}


def make_parser():
    parser = PrivateArgumentParser(prog="commit_privacy_preflight.py",
                                   description=__doc__, allow_abbrev=False)
    sources = parser.add_mutually_exclusive_group(required=True)
    sources.add_argument("--input", metavar="JSON_FILE", help="explicit metadata JSON array")
    sources.add_argument("--stdin", action="store_true", help="metadata JSON array on stdin")
    sources.add_argument("--repo", metavar="REPO_ROOT", help="explicit local repository root")
    parser.add_argument("--ref", action="append", help="HEAD, full refs/... name, or full OID; repeatable")
    parser.add_argument("--exclude-ref", action="append", help="explicit existing baseline and its ancestors to exclude; repo mode only")
    parser.add_argument("--allowlist", metavar="JSON_FILE", help="explicit exact-address JSON array")
    return parser


def main(argv=None):
    try:
        args = make_parser().parse_args(argv)
        if bool(args.repo) != bool(args.ref):
            raise PreflightError("repo_and_ref_required_together")
        if args.exclude_ref and not args.repo:
            raise PreflightError("exclude_ref_requires_repo")
        allowlist = load_allowlist(args.allowlist)
        if args.repo:
            records = local_records(args.repo, args.ref, args.exclude_ref)
        elif args.stdin:
            records = validate_records(load_json(sys.stdin.buffer))
        else:
            records = validate_records(load_json_file(args.input))
        result = inspect_records(records, allowlist)
        code = 1 if result["violations"] else 0
    except PreflightError as error:
        result = {"status": "error", "error_code": str(error)}
        code = 2
    except KeyboardInterrupt:
        result = {"status": "error", "error_code": "interrupted"}
        code = 2
    except Exception:
        # Suppress exception text, paths, input, and tracebacks on every error.
        result = {"status": "error", "error_code": "unexpected_error"}
        code = 2
    try:
        print(json.dumps(result, ensure_ascii=True, sort_keys=True))
    except (OSError, BrokenPipeError):
        return 2
    return code


if __name__ == "__main__":
    sys.exit(main())
