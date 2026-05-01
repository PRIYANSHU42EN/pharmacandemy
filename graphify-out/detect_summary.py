import json
from graphify.detect import detect
from pathlib import Path

d = detect(Path('.'))
# Save full detect result for next steps
Path('graphify-out/.graphify_detect.json').write_text(json.dumps(d, indent=2))

print(f"Corpus: {d['total_files']} files · ~{d['total_words']} words")
for k, v in d.get('files', {}).items():
    if v:
        print(f"  {k}: {len(v)} files")
