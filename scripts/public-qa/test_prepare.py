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

    def archived_entry(self, body):
        entry = self.entry(body, 'pikalab/.code-studio/index.html')
        entry['url'] = ('https://katakatalab.com/pikalab/code-studio/qa-source/index-'
                        + entry['sha256'] + '.bin')
        entry['fallback_url'] = 'https://katakatalab.com/pikalab/code-studio/index.html'
        return entry

    def test_missing_archive_uses_legacy_url_under_the_same_original_contract(self):
        body = b'pinned original HTML'
        entry = self.archived_entry(body)
        with patch.object(prepare, 'published_bytes', side_effect=[
                prepare.PublishedDependencyNotFound('HTTP 404'), body]) as fetch:
            prepare.materialize(self.baseline, entry)
        self.assertEqual(fetch.call_args_list[0].args, (entry,))
        self.assertEqual(fetch.call_args_list[1].args, ({**entry, 'url': entry['fallback_url']},))
        self.assertEqual(fetch.call_count, 2)
        self.assertEqual((self.baseline / entry['path']).read_bytes(), body)

    def test_published_archive_never_requests_the_changed_live_page(self):
        body = b'pinned original HTML'
        entry = self.archived_entry(body)
        with patch.object(prepare, 'published_bytes', return_value=body) as fetch:
            prepare.materialize(self.baseline, entry)
        fetch.assert_called_once_with(entry)
        self.assertEqual((self.baseline / entry['path']).read_bytes(), body)

    def test_bad_archive_is_rejected_without_legacy_fallback(self):
        body = b'pinned original HTML'
        entry = self.archived_entry(body)
        for bad_body in (b'x' * len(body), body + b'changed'):
            with self.subTest(bad_body=bad_body):
                with patch.object(prepare, 'published_bytes', return_value=bad_body) as fetch:
                    with self.assertRaisesRegex(ValueError, 'Published dependency changed'):
                        prepare.materialize(self.baseline, entry)
                fetch.assert_called_once_with(entry)
                self.assertFalse((self.baseline / entry['path']).exists())

    def test_missing_archive_does_not_allow_changed_legacy_bytes(self):
        body = b'pinned original HTML'
        entry = self.archived_entry(body)
        with patch.object(prepare, 'published_bytes', side_effect=[
                prepare.PublishedDependencyNotFound('HTTP 404'), b'x' * len(body)]) as fetch:
            with self.assertRaisesRegex(ValueError, 'Published dependency changed'):
                prepare.materialize(self.baseline, entry)
        self.assertEqual(fetch.call_count, 2)
        self.assertFalse((self.baseline / entry['path']).exists())

    def test_only_http_404_permits_archive_fallback(self):
        entry = self.archived_entry(b'pinned original HTML')
        for status in (403, 410, 500):
            with self.subTest(status=status):
                response = type('Response', (), {'status': status, 'read': lambda *_: b''})()
                connection = type('Connection', (), {
                    'request': lambda *_args, **_kwargs: None,
                    'getresponse': lambda _: response,
                    'close': lambda _: None
                })()
                with patch.object(prepare.connections, 'https', connection, create=True):
                    with patch.object(prepare.http.client, 'HTTPSConnection', return_value=connection):
                        with patch.object(prepare.time, 'sleep'):
                            with patch.object(prepare, 'published_bytes', wraps=prepare.published_bytes) as fetch:
                                with self.assertRaises((ValueError, RuntimeError)):
                                    prepare.materialize(self.baseline, entry)
                self.assertTrue(fetch.call_count >= 1)
                self.assertTrue(all(call.args[0]['url'] == entry['url'] for call in fetch.call_args_list))
                self.assertFalse((self.baseline / entry['path']).exists())

    def test_http_404_is_distinguished_and_consumed(self):
        class Response:
            status = 404
            consumed = False

            def read(self):
                self.consumed = True
                return b'not found'

        response = Response()
        connection = type('Connection', (), {
            'request': lambda *_args, **_kwargs: None,
            'getresponse': lambda _: response
        })()
        with patch.object(prepare.connections, 'https', connection, create=True):
            with self.assertRaises(prepare.PublishedDependencyNotFound):
                prepare.published_bytes(self.archived_entry(b'pinned original HTML'))
        self.assertTrue(response.consumed)

    def test_legacy_url_keeps_the_existing_anonymous_origin_boundary(self):
        entry = self.archived_entry(b'pinned original HTML')
        actual_fetch = prepare.published_bytes
        for url in ('http://katakatalab.com/original.bin', 'https://example.com/original.bin',
                    'https://katakatalab.com/original.bin?token=example',
                    'https://katakatalab.com/original.bin#fragment'):
            with self.subTest(url=url):
                entry['fallback_url'] = url

                def fetch(candidate):
                    if candidate['url'] == entry['url']:
                        raise prepare.PublishedDependencyNotFound('HTTP 404')
                    return actual_fetch(candidate)

                with patch.object(prepare, 'published_bytes', side_effect=fetch):
                    with patch.object(prepare.http.client, 'HTTPSConnection') as connection:
                        with self.assertRaisesRegex(ValueError, 'Only anonymous published site dependencies'):
                            prepare.materialize(self.baseline, entry)
                connection.assert_not_called()
                self.assertFalse((self.baseline / entry['path']).exists())

    def test_matching_archive_entry_reuses_verified_local_bytes_without_network(self):
        body = b'pinned original HTML'
        entry = self.archived_entry(body)
        self.put(self.candidate, entry['path'], body)
        with patch.object(prepare, 'published_bytes') as fetch:
            prepare.materialize(self.baseline, entry, self.candidate)
            prepare.materialize(self.baseline, entry)
        fetch.assert_not_called()
        self.assertEqual((self.baseline / entry['path']).read_bytes(), body)

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

    def test_pikalab_area_never_requests_unrelated_root_media(self):
        required = self.entry(b'lab bytes', 'pikalab/vendor/required.js')
        unrelated = self.entry(b'root bytes', 'discount-calc/ogp.png')
        manifest = {'files': [unrelated, required], 'server_fixtures': [
            {'path': '.htaccess', 'content': '# root'},
            {'path': 'pikalab/.htaccess', 'content': '# lab'}]}
        self.put(self.baseline, 'qa/published-dependencies.json', json.dumps(manifest).encode())
        def fetch(entry):
            self.assertEqual(entry['path'], required['path'], 'Root取得障害をPikaLabへ持ち込まない')
            return b'lab bytes'
        with patch.object(sys, 'argv', ['prepare.py', '--root', str(self.baseline), '--area', 'pikalab']):
            with patch.object(prepare, 'published_bytes', side_effect=fetch):
                prepare.main()
        self.assertEqual((self.baseline / required['path']).read_bytes(), b'lab bytes')
        self.assertFalse((self.baseline / unrelated['path']).exists())
        self.assertFalse((self.baseline / '.htaccess').exists())
        self.assertIn('# lab', (self.baseline / 'pikalab/.htaccess').read_text())

    def test_area_selection_keeps_all_pikalab_entries_and_all_default_inputs(self):
        entries = [self.entry(b'a', path) for path in [
            'pikalab/vendor/a.js', 'pikalab/images/b.png', 'pikalab/.htaccess',
            'pikalab-other/a.js', 'ogp.png']]
        self.assertEqual(prepare.selected_entries(entries, 'all'), entries)
        self.assertEqual(prepare.selected_entries(entries, 'pikalab'), entries[:3])

    def test_pikalab_selection_keeps_required_asset_integrity_failure(self):
        entry = self.entry(b'required', 'pikalab/vendor/required.js')
        with patch.object(prepare, 'published_bytes', return_value=b'wrong'):
            with self.assertRaisesRegex(ValueError, 'Published dependency changed'):
                prepare.materialize(self.baseline, prepare.selected_entries([entry], 'pikalab')[0])


if __name__ == '__main__':
    unittest.main()
