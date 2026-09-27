"""Validate local module references and emit a deployable static build."""
from pathlib import Path
import re, shutil
root=Path(__file__).resolve().parent.parent
errors=[]
for file in (root/'src').rglob('*.js'):
    for ref in re.findall(r"(?:from\s*|import\s*\(?\s*)['\"]([^'\"]+)['\"]",file.read_text()):
        if ref.startswith('.') and not (file.parent/ref).resolve().is_file(): errors.append(f'{file}: {ref}')
if errors: raise SystemExit('\n'.join(errors))
out=root/'dist';out.mkdir(exist_ok=True)
for name in ['src','vendor']: shutil.copytree(root/name,out/name,dirs_exist_ok=True)
for name in ['index.html','style.css']: shutil.copy2(root/name,out/name)
print(f'Build OK: {out}')
