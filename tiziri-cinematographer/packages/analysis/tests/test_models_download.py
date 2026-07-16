"""The download manager's mechanism (constraint #8): checksum verification,
corruption rejection, and resumability — tested with an injected opener so no
network or 300 MB weight file is needed."""
import hashlib
import tempfile
import unittest
from pathlib import Path

from tiziri_analysis.models import DownloadError, ModelEntry, download


def entry_for(content: bytes) -> ModelEntry:
    return ModelEntry(id="t", filename="t.bin", url="http://x/t.bin",
                      sha256=hashlib.sha256(content).hexdigest(), size_bytes=len(content),
                      license="Apache-2.0", source="test", pinned=True)


def opener_full(content: bytes):
    def _open(url, resume_from):
        body = content[resume_from:]
        return len(body), (bytes([b]) for b in body)  # 1-byte chunks
    return _open


class TestDownload(unittest.TestCase):
    def test_successful_download_verifies_checksum(self):
        content = b"tiziri weights payload" * 100
        with tempfile.TemporaryDirectory() as d:
            path = download(entry_for(content), d, _opener=opener_full(content))
            self.assertEqual(Path(path).read_bytes(), content)

    def test_checksum_mismatch_is_rejected_and_partial_removed(self):
        content = b"good payload"
        bad = entry_for(b"different")  # checksum won't match `content`
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(DownloadError):
                download(bad, d, _opener=opener_full(content))
            self.assertFalse((Path(d) / "t.bin.part").exists())  # cleaned up
            self.assertFalse((Path(d) / "t.bin").exists())

    def test_resume_from_partial(self):
        content = b"resumable-download-content" * 50
        with tempfile.TemporaryDirectory() as d:
            part = Path(d) / "t.bin.part"
            part.write_bytes(content[:200])  # a prior partial download
            path = download(entry_for(content), d, _opener=opener_full(content))
            self.assertEqual(Path(path).read_bytes(), content)

    def test_unpinned_entry_refuses_to_fetch(self):
        e = ModelEntry(id="u", filename="u.bin", url="", sha256="", size_bytes=0,
                       license="Apache-2.0", source="test", pinned=False)
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(DownloadError):
                download(e, d, _opener=opener_full(b"x"))


if __name__ == "__main__":
    unittest.main()
