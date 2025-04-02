*NOTE* Make sure you use a vm or have a second admin account. Using this software can potentially lock you out of your pc.

install node.js
then once downloaded open and run powershell/commandprompt as admin and type the two commands to see version numbers (make sure there are no errors)
-> node -v
-> npm -v

then make project folder
-> mkdir my-node-project

change directory to project folder
-> cd my-node-project

inside the the folder run the command which will create a package.json
-> npm init -y

run this command to install express a framework to make servers
-> npm install express
You’ll now see express added as a dependency in your package.json, and a node_modules folder created.

inside the the main project folder place the server.js, fingerprints, lockstate, DriveMonitor files into it, then create a folder named "public" and this is were you will place the css, html, script, and manage file.

to run the server locally, on the command line type 
-> cd my-node-project
-> node server.js

you will get a url as an output which you will paste into your browser.






