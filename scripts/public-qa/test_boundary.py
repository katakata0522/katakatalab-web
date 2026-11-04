"""Exercise workflow boundary rules against isolated Git indexes."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

CHECKER = Path(__file__).with_name('boundary.py')
READ_ONLY = 'permissions:\n  contents: read\n'
PIN = 'actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803'


class WorkflowBoundaryTests(unittest.TestCase):
    def inspect(self, action, *, target=True, extra=''):
        with tempfile.TemporaryDirectory(prefix='public-boundary-') as directory:
            root = Path(directory)
            (root / 'scripts/public-qa').mkdir(parents=True)
            shutil.copyfile(CHECKER, root / 'scripts/public-qa/boundary.py')
            (root / 'qa').mkdir()
            (root / 'qa/published-dependencies.json').write_text('{"files":[]}', encoding='utf8')
            (root / '.github/workflows').mkdir(parents=True)
            (root / '.github/workflows/caller.yml').write_text(
                READ_ONLY + 'jobs:\n  check:\n    uses: ' + action + '\n' + extra, encoding='utf8')
            if target:
                (root / '.github/workflows/target.yml').write_text(
                    'on:\n  workflow_call:\n' + READ_ONLY, encoding='utf8')
            for args in [('init', '-q'), ('add', '.')]:
                subprocess.run(['git', *args], cwd=root, check=True, capture_output=True)
            return subprocess.run([sys.executable, 'scripts/public-qa/boundary.py'],
                                  cwd=root, capture_output=True, text=True)

    def test_pinned_external_action(self):
        self.assertEqual(self.inspect(PIN).returncode, 0)

    def test_same_commit_local_workflow(self):
        self.assertEqual(self.inspect('./.github/workflows/target.yml').returncode, 0)

    def test_missing_local_workflow(self):
        self.assertNotEqual(self.inspect('./.github/workflows/target.yml', target=False).returncode, 0)

    def test_local_paths_cannot_escape_workflows(self):
        for action in ['./.github/workflows/../target.yml', './scripts/run.yml',
                       './.github/workflows/target.yml@main', './.github/workflows/${{inputs.path}}']:
            with self.subTest(action=action):
                self.assertNotEqual(self.inspect(action).returncode, 0)

    def test_tags_and_branches_are_not_pins(self):
        for action in ['actions/checkout@v6', 'actions/checkout@main', 'other/repo@abc123']:
            with self.subTest(action=action):
                self.assertNotEqual(self.inspect(action).returncode, 0)

    def test_local_workflow_cannot_hide_privileged_operations(self):
        for extra in ['env:\n  TOKEN: ${{ secrets.TOKEN }}\n', 'permissions:\n  contents: write\n',
                      'on:\n  pull_request_target:\n', 'on:\n  workflow_run:\n']:
            with self.subTest(extra=extra):
                self.assertNotEqual(self.inspect('./.github/workflows/target.yml', extra=extra).returncode, 0)


if __name__ == '__main__':
    unittest.main()
