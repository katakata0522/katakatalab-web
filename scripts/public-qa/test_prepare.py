import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location('qa_prepare', Path(__file__).with_name('prepare.py'))
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class DependencyReuse(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.candidate = self.root / 'candidate'
        self.baseline = self.root / 'baseline'
        self.candidate.mkdir()
        self.baseline.mkdir()

    def entry(self, body, name='pikalab/vendor/example.js'):
        return {'path': name, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest(),
                'url': 'https://katakatalab.com/' + name}

    def put(self, root, name, body):
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(body)
        return target

    def test_matching_candidate_is_reused_without_network_and_not_modified(self):
        body = b'published bytes'
        entry = self.entry(body)
        source = self.put(self.candidate, entry['path'], body)
        with patch.object(prepare, 'published_bytes') as fetch:
            prepare.materialize(self.baseline, entry, self.candidate)
        fetch.assert_not_called()
        self.assertEqual((self.baseline / entry['path']).read_bytes(), body)
        self.assertEqual(source.read_bytes(), body)
        self.assertNotEqual(source.resolve(), (self.baseline / entry['path']).resolve())

    def test_different_baseline_revision_is_fetched_under_its_own_contract(self):
        entry = self.entry(b'old published version')
        source = self.put(self.candidate, entry['path'], b'new candidate version')
        with patch.object(prepare, 'published_bytes', return_value=b'old published version') as fetch:
            prepare.materialize(self.baseline, entry, self.candidate)
        fetch.assert_called_once_with(entry)
        self.assertEqual((self.baseline / entry['path']).read_bytes(), b'old published version')
        self.assertEqual(source.read_bytes(), b'new candidate version')

    def test_missing_or_corrupt_candidate_uses_original_fetch_and_hash_guard(self):
        entry = self.entry(b'expected')
        for reused in (None, b'corrupt'):
            with self.subTest(reused=reused):
                if reused is not None:
                    self.put(self.candidate, entry['path'], reused)
                with patch.object(prepare, 'published_bytes', return_value=b'wrong remote bytes') as fetch:
                    with self.assertRaisesRegex(ValueError, 'Published dependency changed'):
                        prepare.materialize(self.baseline, entry, self.candidate)
                fetch.assert_called_once_with(entry)
                self.assertFalse((self.baseline / entry['path']).exists())

    def test_existing_valid_destination_still_needs_no_network(self):
        body = b'already prepared'
        entry = self.entry(body)
        self.put(self.baseline, entry['path'], body)
        with patch.object(prepare, 'published_bytes') as fetch:
            prepare.materialize(self.baseline, entry, self.candidate)
        fetch.assert_not_called()

    def test_synthetic_fixture_uses_its_specification_instead_of_candidate(self):
        entry = {'path': 'pikalab/images/pending.png',
                 'ci_fixture': {'format': 'png', 'width': 2, 'height': 3}}
        self.put(self.candidate, entry['path'], b'not the baseline fixture')
        with patch.object(prepare, 'published_bytes') as fetch:
            prepare.materialize(self.baseline, entry, self.candidate)
        fetch.assert_not_called()
        self.assertEqual((self.baseline / entry['path']).read_bytes(), prepare.fixture_bytes(entry['ci_fixture']))

    def test_reuse_rejects_symlinks_without_reading_outside_checkout(self):
        body = b'outside bytes'
        entry = self.entry(body)
        outside = self.root / 'outside.js'
        outside.write_bytes(body)
        source = self.candidate / entry['path']
        source.parent.mkdir(parents=True)
        source.symlink_to(outside)
        with patch.object(prepare, 'published_bytes') as fetch:
            with self.assertRaisesRegex(ValueError, 'escapes root|Symlink'):
                prepare.materialize(self.baseline, entry, self.candidate)
        fetch.assert_not_called()
        self.assertFalse((self.baseline / entry['path']).exists())

    def test_no_reuse_argument_keeps_anonymous_fetch_behavior(self):
        entry = self.entry(b'normal bytes')
        with patch.object(prepare, 'published_bytes', return_value=b'normal bytes') as fetch:
            prepare.materialize(self.baseline, entry)
        fetch.assert_called_once_with(entry)

    def test_cli_reuses_only_matching_entries_and_keeps_baseline_server_fixture(self):
        same = self.entry(b'same', 'pikalab/vendor/same.js')
        different = self.entry(b'baseline', 'pikalab/vendor/changed.js')
        self.put(self.candidate, same['path'], b'same')
        self.put(self.candidate, different['path'], b'candidate')
        manifest = {'files': [same, different],
                    'server_fixtures': [{'path': '.htaccess', 'content': '# baseline fixture\n'}]}
        self.put(self.baseline, 'qa/published-dependencies.json', json.dumps(manifest).encode())
        with patch.object(sys, 'argv', ['prepare.py', '--root', str(self.baseline), '--reuse-root', str(self.candidate)]):
            with patch.object(prepare, 'published_bytes', return_value=b'baseline') as fetch:
                prepare.main()
        fetch.assert_called_once_with(different)
        self.assertEqual((self.baseline / same['path']).read_bytes(), b'same')
        self.assertEqual((self.baseline / different['path']).read_bytes(), b'baseline')
        self.assertEqual((self.baseline / '.htaccess').read_text(),
                         '# CI fixture only. Never deploy this file.\n# baseline fixture\n')


if __name__ == '__main__':
    unittest.main()
