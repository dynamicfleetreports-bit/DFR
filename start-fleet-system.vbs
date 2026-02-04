Set objShell = CreateObject("WScript.Shell")

' Get the directory where this script is located
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Change to project directory and run npm dev (hidden)
objShell.Run "cmd /c cd /d """ & scriptDir & """ && npm run dev", 0, False

' Wait 3 seconds for server to start
WScript.Sleep 3000

' Open browser
objShell.Run "http://localhost:8000/launch.html"

Set objShell = Nothing