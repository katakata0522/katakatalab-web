import unittest

from node_runtime import exact, latest_lts


class RuntimeTest(unittest.TestCase):
    def test_pin_requires_one_exact_supported_version(self):
        self.assertEqual(exact('24.2.3\n'), '24.2.3')
        for value in ('24', '24.x', 'v24.2.3', '25.1.0', '24.02.3', '24.2.3-rc.1', '24.2.3\n24.2.4'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                exact(value)

    def test_selects_newest_stable_lts_numerically_and_requires_existing_pin(self):
        def release(version, lts='Krypton', files=('linux-x64',)):
            return {'version':'v' + version,'lts':lts,'files':files}
        releases = [release('24.2.9'), release('24.2.10'), release('24.3.0-rc.1'),
                    release('26.8.0'), release('24.3.1', False), release('24.3.2', files=['src'])]
        self.assertEqual(latest_lts(releases, '24.2.9'), '24.2.10')
        with self.assertRaises(ValueError):
            latest_lts(releases, '24.2.11')
