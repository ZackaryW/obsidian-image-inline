import os
import shutil

if not os.path.exists("project.toml"):
    os.system("pysidian init")
    import toml
    tomldata = toml.load("project.toml")
    tomldata["pysidian"]["pluginDir"] = "build"
    toml.dump(tomldata, open("project.toml", "w"))

os.makedirs("pysidian-release", exist_ok=True)
os.makedirs("build", exist_ok=True)

if not os.path.exists("test-vault"):
    os.system("pysidian vault new test-vault")

os.system("pysidian vault reg")

os.system("npm run build")
shutil.move("main.js", os.path.join("build", "main.js"))
shutil.copy("manifest.json", os.path.join("build", "manifest.json"))

os.system("pysidian commit")
os.system("pysidian update")
os.system("pysidian vault open")

input("Press Enter to continue...")
os.system("pysidian vault unreg")
