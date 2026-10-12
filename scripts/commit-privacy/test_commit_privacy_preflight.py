import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import commit_privacy_preflight as preflight


SCRIPT = Path(__file__).with_name("commit_privacy_preflight.py")
SAFE = "12345+example-user@users.noreply.github.com"
PRIVATE = "personal-mailbox@example.invalid"
PUBLIC = "public-contact@example.test"
BOT = "41898282+github-actions[bot]@users.noreply.github.com"
WEB_FLOW = "noreply@github.com"


def record(author=SAFE, committer=SAFE, **extra):
    return {"author_email": author, "committer_email": committer, **extra}


class CLITests(unittest.TestCase):
    def invoke(self, args, data=None, env=None):
        result = subprocess.run([sys.executable, str(SCRIPT), *args], input=data,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                env=env, timeout=45)
        self.assertEqual(result.stderr, b"")
        return result.returncode, json.loads(result.stdout), result.stdout

    def metadata(self, records, extra=None):
        return self.invoke(["--stdin", *(extra or [])], json.dumps(records).encode())

    def test_noreply_human_bot_and_web_flow(self):
        samples = [SAFE, "example-user@users.noreply.github.com", BOT,
                   "dependabot[bot]@users.noreply.github.com", WEB_FLOW,
                   "9876+managed_user@users.noreply.github.com"]
        code, result, _ = self.metadata([record(x, x) for x in samples])
        self.assertEqual(code, 0)
        self.assertEqual(result["checked_commits"], len(samples))

    def test_private_author_is_redacted(self):
        code, result, output = self.metadata([record(PRIVATE, WEB_FLOW)])
        self.assertEqual(code, 1)
        self.assertEqual(result["violations"][0]["role"], "author")
        self.assertNotIn(PRIVATE.encode(), output)
        self.assertNotIn(b"@", output)

    def test_private_committer_is_redacted(self):
        code, result, output = self.metadata([record(SAFE, PRIVATE)])
        self.assertEqual(code, 1)
        self.assertEqual(result["violations"][0]["role"], "committer")
        self.assertNotIn(b"@", output)

    def test_both_roles_are_checked(self):
        code, result, _ = self.metadata([record(PRIVATE, PUBLIC)])
        self.assertEqual(code, 1)
        self.assertEqual(len(result["violations"]), 2)

    def test_noreply_substring_domain_spoofs_fail(self):
        samples = ["person@users.noreply.github.com.example.invalid",
                   "person@noreply.github.com", "person@github.com",
                   "noreply@example.test", "123+person@users.noreply.github.comm",
                   "person@sub.users.noreply.github.com"]
        code, result, _ = self.metadata([record(x) for x in samples])
        self.assertEqual(code, 1)
        self.assertEqual(len(result["violations"]), len(samples))

    def test_malformed_addresses_fail(self):
        samples = ["", " ", " " + SAFE, SAFE + "\n", "Name <" + SAFE + ">",
                   "x@@users.noreply.github.com", "x\x00@users.noreply.github.com",
                   "x@users.noreply.github.com.", "ü@users.noreply.github.com",
                   "x..y@users.noreply.github.com", "a@-example.test",
                   "person\r\nsecret@example.invalid"]
        code, result, output = self.metadata([record(x) for x in samples])
        self.assertEqual(code, 1)
        self.assertEqual(len(result["violations"]), len(samples))
        self.assertNotIn(b"@", output)
        self.assertNotIn(b"secret", output)

    def test_exact_allowlist_is_explicit_and_does_not_allow_domain(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "allow.json"
            path.write_text(json.dumps([PUBLIC]))
            code, result, _ = self.metadata([record(PUBLIC)], ["--allowlist", str(path)])
            self.assertEqual(code, 0)
            code, result, _ = self.metadata([record("another@example.test")],
                                            ["--allowlist", str(path)])
            self.assertEqual(code, 1)

    def test_no_allowlist_autodiscovery(self):
        code, _, _ = self.metadata([record(PUBLIC)])
        self.assertEqual(code, 1)

    def test_bad_allowlist_fails_closed_and_redacts(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "allow.json"
            for value in [PUBLIC, ["*@example.test"], ["a[b]@example.test"],
                          ["example[bot]@example.test"], [123], {"email": PUBLIC}]:
                path.write_text(json.dumps(value))
                code, result, output = self.metadata([record()], ["--allowlist", str(path)])
                self.assertEqual(code, 2)
                self.assertNotIn(b"@", output)

    def test_empty_missing_or_invalid_json(self):
        samples = [b"", b"[]", b"null", b"{}", b"[", b"\xff", b"[NaN]",
                   b'[{"author_email":"' + PRIVATE.encode() + b'"}]']
        for sample in samples:
            with self.subTest(sample_number=samples.index(sample)):
                code, result, output = self.invoke(["--stdin"], sample)
                self.assertEqual(code, 2)
                self.assertEqual(result["status"], "error")
                self.assertNotIn(b"@", output)

    def test_duplicate_keys_fail_even_when_last_value_safe(self):
        raw = ('[{"author_email":"' + PRIVATE + '","author_email":"' + SAFE
               + '","committer_email":"' + SAFE + '"}]').encode()
        code, result, output = self.invoke(["--stdin"], raw)
        self.assertEqual(code, 2)
        self.assertEqual(result["error_code"], "duplicate_json_key")
        self.assertNotIn(b"@", output)

    def test_schema_and_identifier_redaction(self):
        samples = [[record(oid=PRIVATE)], [record(subject=PRIVATE)],
                   [record(author=None)], [record(author_email=None)], [PRIVATE],
                   [record(), {"committer_email": PRIVATE}]]
        for sample in samples:
            code, _, output = self.metadata(sample)
            self.assertEqual(code, 2)
            self.assertNotIn(b"@", output)

    def test_missing_arguments_and_unknown_arguments_do_not_echo(self):
        for args in [[], ["--unknown=" + PRIVATE], [PRIVATE],
                     ["--ref", PRIVATE], ["--repo", PRIVATE],
                     ["--stdin", "--ref", PRIVATE], ["--in", PRIVATE]]:
            code, _, output = self.invoke(args, b"[]")
            self.assertEqual(code, 2)
            self.assertNotIn(PRIVATE.encode(), output)

    def test_missing_input_path_does_not_echo_path(self):
        code, _, output = self.invoke(["--input", "/nonexistent/" + PRIVATE])
        self.assertEqual(code, 2)
        self.assertNotIn(b"@", output)

    def test_explicit_json_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "commits.json"
            path.write_text(json.dumps([record()]))
            code, result, _ = self.invoke(["--input", str(path)])
            self.assertEqual(code, 0)

    def test_input_size_and_record_count_limits(self):
        with mock.patch.object(preflight, "MAX_INPUT_BYTES", 10):
            from io import BytesIO
            with self.assertRaises(preflight.PreflightError):
                preflight.load_json(BytesIO(b" " * 11))
        with mock.patch.object(preflight, "MAX_COMMITS", 1):
            with self.assertRaises(preflight.PreflightError):
                preflight.validate_records([record(), record()])

    def test_only_validated_oid_is_reported(self):
        code, result, output = self.metadata([record(PRIVATE, oid="a" * 40)])
        self.assertEqual(code, 1)
        self.assertEqual(result["violations"][0]["oid"], "a" * 40)
        self.assertNotIn(b"@", output)

    def test_help_prog_does_not_echo_script_name(self):
        with mock.patch.object(sys, "argv", [PRIVATE]):
            help_text = preflight.make_parser().format_help()
        self.assertNotIn(PRIVATE, help_text)


class GitTests(unittest.TestCase):
    invoke = CLITests.invoke
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name) / "fixture"
        self.repo.mkdir()
        self.git("init", "--quiet")
        self.tree = self.git("mktree", data=b"").decode().strip()

    def git(self, *args, data=None, author=SAFE, committer=SAFE):
        env = preflight.git_environment()
        env.update({"GIT_AUTHOR_NAME": "Example", "GIT_COMMITTER_NAME": "Example",
                    "GIT_AUTHOR_EMAIL": author, "GIT_COMMITTER_EMAIL": committer,
                    "GIT_AUTHOR_DATE": "2000-01-01T00:00:00+00:00",
                    "GIT_COMMITTER_DATE": "2000-01-01T00:00:00+00:00"})
        result = subprocess.run(["git", "-C", str(self.repo), *args], input=data,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                env=env, check=True, timeout=10)
        return result.stdout

    def commit(self, parents=(), author=SAFE, committer=SAFE):
        args = ["commit-tree", self.tree]
        for parent in parents:
            args.extend(["-p", parent])
        return self.git(*args, data=b"Fixture\n", author=author,
                        committer=committer).decode().strip()

    def check_ref(self, ref, env=None):
        return self.invoke(["--repo", str(self.repo), "--ref", ref], env=env)

    def test_explicit_baseline_leaves_old_history_untouched(self):
        base = self.commit(author=PRIVATE)
        tip = self.commit([base])
        code, result, output = self.invoke(["--repo", str(self.repo), "--ref", tip,
                                             "--exclude-ref", base])
        self.assertEqual(code, 0)
        self.assertEqual(result["checked_commits"], 1)
        self.assertNotIn(b"@", output)

    def test_new_private_commit_still_fails_after_baseline(self):
        base = self.commit(author=PRIVATE)
        tip = self.commit([base], committer=PRIVATE)
        code, result, output = self.invoke(["--repo", str(self.repo), "--ref", tip,
                                             "--exclude-ref", base])
        self.assertEqual(code, 1)
        self.assertEqual(result["checked_commits"], 1)
        self.assertEqual(result["violations"][0]["role"], "committer")
        self.assertNotIn(b"@", output)

    def test_empty_explicit_range_is_reported_as_zero(self):
        base = self.commit()
        code, result, _ = self.invoke(["--repo", str(self.repo), "--ref", base,
                                        "--exclude-ref", base])
        self.assertEqual(code, 0)
        self.assertEqual(result["checked_commits"], 0)

    def test_invalid_baseline_fails_closed(self):
        tip = self.commit()
        code, result, _ = self.invoke(["--repo", str(self.repo), "--ref", tip,
                                        "--exclude-ref", "refs/heads/missing"])
        self.assertEqual(code, 2)
        self.assertEqual(result["status"], "error")

    def test_baseline_rejected_in_json_mode(self):
        code, result, _ = self.invoke(["--stdin", "--exclude-ref", "HEAD"],
                                       data=json.dumps([record()]).encode())
        self.assertEqual(code, 2)
        self.assertEqual(result["error_code"], "exclude_ref_requires_repo")

    def test_git_test_merge_checks_author_and_committer(self):
        base = self.commit()
        left = self.commit([base])
        right = self.commit([base], author=BOT, committer=WEB_FLOW)
        merge = self.commit([left, right], author=PRIVATE, committer=WEB_FLOW)
        self.git("update-ref", "refs/pull/7/merge", merge)
        code, result, output = self.check_ref("refs/pull/7/merge")
        self.assertEqual(code, 1)
        self.assertEqual(result["checked_commits"], 4)
        self.assertEqual(result["violations"], [{"record": 1, "role": "author",
                                              "reason": "email_not_allowed", "oid": merge}])
        self.assertNotIn(b"@", output)

    def test_git_private_committer_in_ancestor(self):
        base = self.commit(committer=PRIVATE)
        tip = self.commit([base], author=BOT, committer=WEB_FLOW)
        self.git("update-ref", "refs/heads/example", tip)
        code, result, _ = self.check_ref("refs/heads/example")
        self.assertEqual(code, 1)
        self.assertEqual(result["checked_commits"], 2)
        self.assertEqual(result["violations"][0]["role"], "committer")

    def test_git_clean_bot_web_flow_passes(self):
        tip = self.commit(author=BOT, committer=WEB_FLOW)
        self.git("update-ref", "refs/heads/example", tip)
        self.assertEqual(self.check_ref("refs/heads/example")[0], 0)
        self.assertEqual(self.check_ref(tip)[0], 0)

    def test_git_missing_ref_and_revision_expressions_fail(self):
        self.commit()
        for ref in ["refs/pull/999/merge", "main", "HEAD~1", "HEAD..main",
                    "--all", "refs/heads/" + PRIVATE]:
            code, _, output = self.check_ref(ref)
            self.assertEqual(code, 2)
            self.assertNotIn(b"@", output)

    def test_git_does_not_discover_parent_repository(self):
        child = self.repo / "child"
        child.mkdir()
        code, result, _ = self.invoke(["--repo", str(child), "--ref", "HEAD"])
        self.assertEqual(code, 2)
        self.assertEqual(result["error_code"], "explicit_repository_root_required")

    def test_git_bogus_marker_does_not_discover_parent_repository(self):
        oid = self.commit()
        self.git("update-ref", "refs/heads/example", oid)
        child = self.repo / "child"
        child.mkdir()
        marker = child / ".git"
        marker.mkdir()
        code, _, _ = self.invoke(["--repo", str(child), "--ref", "refs/heads/example"])
        self.assertEqual(code, 2)
        marker.rmdir()
        marker.write_text("not a valid git directory")
        code, _, _ = self.invoke(["--repo", str(child), "--ref", "refs/heads/example"])
        self.assertEqual(code, 2)

    def test_git_bare_repository_and_linked_worktree(self):
        oid = self.commit()
        self.git("update-ref", "refs/heads/example", oid)
        code, _, _ = self.invoke(["--repo", str(self.repo / ".git"), "--ref", "refs/heads/example"])
        self.assertEqual(code, 0)
        linked = Path(self.temp.name) / "linked"
        self.git("worktree", "add", "--detach", str(linked), oid)
        code, _, _ = self.invoke(["--repo", str(linked), "--ref", "HEAD"])
        self.assertEqual(code, 0)

    def test_git_shallow_repository_fails_closed(self):
        oid = self.commit()
        self.git("update-ref", "refs/heads/example", oid)
        (self.repo / ".git" / "shallow").write_text(oid + "\n")
        code, result, _ = self.check_ref("refs/heads/example")
        self.assertEqual(code, 2)
        self.assertEqual(result["error_code"], "shallow_or_invalid_repository")

    def test_git_mailmap_cannot_hide_raw_address(self):
        oid = self.commit(author=PRIVATE)
        self.git("update-ref", "refs/heads/example", oid)
        (self.repo / ".mailmap").write_text("Example <" + SAFE + "> <" + PRIVATE + ">\n")
        code, _, output = self.check_ref("refs/heads/example")
        self.assertEqual(code, 1)
        self.assertNotIn(b"@", output)

    def test_git_replace_refs_cannot_hide_raw_commit(self):
        original = self.commit(author=PRIVATE)
        replacement = self.commit()
        self.git("update-ref", "refs/heads/example", original)
        self.git("update-ref", "refs/replace/" + original, replacement)
        code, result, _ = self.check_ref("refs/heads/example")
        self.assertEqual(code, 1)
        self.assertEqual(result["violations"][0]["oid"], original)

    def test_inherited_git_config_and_global_settings_not_used(self):
        oid = self.commit()
        self.git("update-ref", "refs/heads/example", oid)
        global_config = Path(self.temp.name) / "global-config"
        global_config.write_text("not valid config " + PRIVATE)
        env = os.environ.copy()
        env.update({"GIT_CONFIG_GLOBAL": str(global_config), "GIT_CONFIG_COUNT": "1",
                    "GIT_CONFIG_KEY_0": "invalid", "GIT_CONFIG_VALUE_0": PRIVATE,
                    "GIT_DIR": "/nonexistent/" + PRIVATE})
        code, _, output = self.check_ref("refs/heads/example", env=env)
        self.assertEqual(code, 0)
        self.assertNotIn(b"@", output)

    def test_git_missing_objects_do_not_lazy_fetch(self):
        oid = self.commit()
        self.git("update-ref", "refs/heads/example", oid)
        marker = Path(self.temp.name) / "network-helper-ran"
        helper = Path(self.temp.name) / "remote-helper"
        helper.write_text("#!/bin/sh\ntouch '" + str(marker) + "'\nexit 99\n")
        helper.chmod(0o700)
        self.git("config", "remote.origin.url", "ext::" + str(helper))
        self.git("config", "remote.origin.promisor", "true")
        self.git("config", "remote.origin.partialclonefilter", "blob:none")
        self.git("config", "protocol.ext.allow", "always")
        object_path = self.repo / ".git" / "objects" / oid[:2] / oid[2:]
        # Git's loose object is read-only on Windows; this is our temporary
        # fixture, not a production repository.
        object_path.chmod(0o600)
        object_path.unlink()
        code, result, _ = self.check_ref("refs/heads/example")
        self.assertEqual(code, 2)
        self.assertFalse(marker.exists())

    def test_git_limit_fails_without_partial_pass(self):
        first = self.commit()
        second = self.commit([first])
        self.git("update-ref", "refs/heads/example", second)
        with mock.patch.object(preflight, "MAX_COMMITS", 1):
            with self.assertRaisesRegex(preflight.PreflightError, "too_many_commits"):
                preflight.local_records(str(self.repo), ["refs/heads/example"])

    def test_git_output_limit_terminates_with_error(self):
        oid = self.commit()
        with mock.patch.object(preflight, "MAX_GIT_BYTES", 4):
            with self.assertRaisesRegex(preflight.PreflightError, "git_output_too_large"):
                preflight.run_git(self.repo, ["cat-file", "commit", oid])


class RawMetadataTests(unittest.TestCase):
    def raw(self, author=SAFE, committer=SAFE):
        return ("tree " + "a" * 40 + "\nauthor Example <" + author
                + "> 0 +0000\ncommitter Example <" + committer + "> 0 +0000\n\nMessage\n").encode()

    def test_duplicate_missing_and_malformed_identity_headers_fail(self):
        raw = self.raw()
        samples = [raw.replace(b"committer", b"author", 1),
                   raw.replace(b"author Example", b"author <invalid>", 1),
                   raw.replace(b"committer Example", b"other Example", 1),
                   raw.replace(b"\ncommitter", b"\n continuation\ncommitter", 1),
                   b"no header separator"]
        for sample in samples:
            with self.assertRaises(preflight.PreflightError):
                preflight.parse_raw_commit("a" * 40, sample)

    def test_multiline_signature_is_allowed(self):
        raw = self.raw().replace(b"\n\nMessage", b"\ngpgsig signature\n continuation\n\nMessage")
        result = preflight.parse_raw_commit("a" * 40, raw)
        self.assertEqual(result["author_email"], SAFE)

    def test_batch_truncation_missing_and_trailing_data_fail(self):
        oid = "a" * 40
        raw = self.raw()
        good = (oid + " commit " + str(len(raw)) + "\n").encode() + raw + b"\n"
        self.assertEqual(len(preflight.parse_batch(good, [oid])), 1)
        for bad in [good[:-2], good + b"extra", (oid + " missing\n").encode(),
                    good.replace(b" commit ", b" tree ", 1)]:
            with self.assertRaises(preflight.PreflightError):
                preflight.parse_batch(bad, [oid])

    def test_git_failure_output_is_suppressed(self):
        with mock.patch("subprocess.Popen", side_effect=FileNotFoundError(PRIVATE)):
            with self.assertRaisesRegex(preflight.PreflightError, "^git_unavailable_or_timeout$"):
                preflight.run_git(Path("."), ["rev-parse", "HEAD"])

    def test_safe_git_environment_is_minimal(self):
        with mock.patch.dict(os.environ, {"SECRET_TOKEN": PRIVATE, "GIT_CONFIG_COUNT": "2"}):
            env = preflight.git_environment()
        self.assertNotIn("SECRET_TOKEN", env)
        self.assertNotIn("GIT_CONFIG_COUNT", env)
        self.assertEqual(env["GIT_NO_LAZY_FETCH"], "1")


if __name__ == "__main__":
    unittest.main()
