import os
import json
import shutil
import psutil

if not os.path.exists("testpit"):
    os.system('pysidian newVault testpit')

# kill obsidian
for proc in psutil.process_iter():
    if proc.name() == "obsidian":
        proc.kill()

os.system("npm run build")
shutil.move("main.js", os.path.join("plugin", "main.js"))

# modify manifest.json-> version bump by 1
with open("manifest.json", "r") as f:
    """
    version is in x.x.x
    """
    data = json.load(f)
    versionSplitted = data["version"].split(".")
    data["version"] = f"{versionSplitted[0]}.{versionSplitted[1]}.{str(int(versionSplitted[2]) + 1)}"

with open("manifest.json", "w") as f:
    json.dump(data, f)

shutil.copy("manifest.json", os.path.join("plugin", "manifest.json"))

if os.path.exists("testpit/.obsidian/plugins/obsidian-image-inline"):
    shutil.rmtree("testpit/.obsidian/plugins/obsidian-image-inline")
# run pysidian
os.system('pysidian selectVault testpit loadPlugin -p plugin openVault')
