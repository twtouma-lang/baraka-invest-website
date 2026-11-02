"""Put the current sample reports inside the page.

The page carries its sample PDFs in the bundler manifest and, on load, rewrites
each sample link to the embedded copy:

    var map = { sample1:'pdf1', ... };
    a.setAttribute('href', window.__resources[map[id]]);

So the visitor always receives the embedded PDF, whatever the link's href says,
and publishing files at assets/samples/ has no effect on what they download.

The export ships stale PDFs: the sample cards were relabelled for the current
reports, but the embedded files are still the previous set, so every sample
downloads the wrong report. This replaces the bytes behind pdf1..pdf4 with the
current reports, matched to the card each id drives.

Re-run with new PDFs whenever the sample set changes.
"""
import base64
import gzip
import hashlib
import json
import os
import re
import sys

# The id in ext_resources -> the report that card offers.
SAMPLES = {
    "pdf1": "SAMPLE_Global_Sector_Conventional.pdf",
    "pdf2": "SAMPLE_GCC_Country_Shariah.pdf",
    "pdf3": "SAMPLE_Indonesia_Retail_Industry_Conventional.pdf",
    "pdf4": "SAMPLE_Japan_Sector_Conventional.pdf",
}

SRC_DIR = "dist/assets/samples"
PATH = "dist/index.html"


def main() -> None:
    src = open(PATH).read()

    ext_m = re.search(r'(<script type="__bundler/ext_resources">\s*)(.*?)(\s*</script>)', src, re.S)
    man_m = re.search(r'(<script type="__bundler/manifest">\s*)(.*?)(\s*</script>)', src, re.S)
    assert ext_m and man_m, "bundler blocks not found"

    ext = json.loads(ext_m.group(2))
    man = json.loads(man_m.group(2))
    by_id = {e["id"]: e["uuid"] for e in ext}

    for rid, filename in SAMPLES.items():
        assert rid in by_id, "%s missing from ext_resources" % rid
        path = os.path.join(SRC_DIR, filename)
        assert os.path.isfile(path), "missing %s" % path

        raw = open(path, "rb").read()
        assert raw[:4] == b"%PDF", "%s is not a PDF" % filename

        uuid = by_id[rid]
        packed = gzip.compress(raw)
        man[uuid] = {
            "mime": "application/pdf",
            "compressed": True,
            "data": base64.b64encode(packed).decode("ascii"),
        }
        print("  %s -> %-52s %7d bytes  sha %s"
              % (rid, filename, len(raw), hashlib.sha256(raw).hexdigest()[:12]))

    encoded = json.dumps(man).replace("</", "<\\/")
    out = src[: man_m.start(2)] + encoded + src[man_m.end(2):]
    open(PATH, "w").write(out)
    print("embedded the current samples;", PATH, "now", len(out), "bytes")


if __name__ == "__main__":
    main()
