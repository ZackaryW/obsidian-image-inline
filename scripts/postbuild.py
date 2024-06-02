from contextlib import contextmanager
import copy
import json
import os
import shutil
import psutil
from time import sleep
import subprocess

def exec_command(path: str, *args) -> None:
    """
    Execute a subprocess with the given arguments.

    Args:
        path: The executable path.
        *args: Variable length argument list.

    Returns:
        None
    """
    subprocess.Popen(
        [path, *(str(arg) for arg in args)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=(
            subprocess.DETACHED_PROCESS
            | subprocess.CREATE_NEW_PROCESS_GROUP
            | subprocess.CREATE_BREAKAWAY_FROM_JOB
        ),
    )


# roaming folder
_roaming = os.environ.get("APPDATA")
_obsidian_config = os.path.join(_roaming, "obsidian", "obsidian.json")

def create_vault():
    plugin = os.path.join("vault-test", ".obsidian", "plugins")
    if os.path.exists(plugin):
        return
    os.makedirs(plugin, exist_ok=True)

    import zipfile

    with zipfile.ZipFile("scripts/vault.zip", "r") as z:
        z.extractall(os.path.join("vault-test", ".obsidian"))

def copy_plugin():
    if os.path.exists("vault-test/.obsidian/plugins/image-inline"):
        shutil.rmtree("vault-test/.obsidian/plugins/image-inline")
    shutil.copytree("output", os.path.join("vault-test", ".obsidian", "plugins", "image-inline"))

def load_config():
    with open(_obsidian_config, "r") as f:
        return json.load(f)

def terminate_obsidian():
    for proc in psutil.process_iter():
        if proc.name().lower() == "obsidian.exe":
            proc.kill()
    sleep(0.2)

@contextmanager
def temp_register(path : str):
    terminate_obsidian()
    sleep(0.2)
    original = load_config()
    
    try:
        modified = copy.deepcopy(original)

        modified["vaults"]["t0t0t0t0t0t0t0t0"] = {
            "path": os.path.abspath(path),
            "ts" : int(os.path.getmtime(path)*1000)
        }

        with open(_obsidian_config, "w") as f:
            json.dump(modified, f)
        
        sleep(1)

        yield
    finally:
        #restore
        with open(_obsidian_config, "w") as f:
            json.dump(original, f)
    
def open_obsidian_vault(vault_name):
    import platform
    url = f"obsidian://open?vault={vault_name}"
    if platform.system() == "Windows":
        os.startfile(url)
    elif platform.system() == "Darwin":  # macOS
        subprocess.Popen(["open", url])
    else:  # Assuming a Unix-based system
        subprocess.Popen(["nohup", "xdg-open", url, "&"])

def open_vault():
    with temp_register("vault-test"):
        open_obsidian_vault("t0t0t0t0t0t0t0t0")

if __name__ == "__main__":
    if os.path.exists("output/manifest.json"):
        os.remove("output/manifest.json")
    shutil.copyfile("src/manifest.json", "output/manifest.json")
    if os.path.exists("manifest.json"):
        os.remove("manifest.json")
    shutil.copyfile("src/manifest.json", "manifest.json")
    create_vault()
    copy_plugin()
    open_vault()
    input("Press Enter to continue...")