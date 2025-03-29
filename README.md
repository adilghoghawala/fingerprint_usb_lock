install node.js
open and run powershell/commandprompt as admin and type the two commands to see version numbers (make sure there are no errors)
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

inside the the main project folder place the server.js file into it, then create a folder named "public" and this is were you will place the css, html, and js file

before running the script functions on the website make sure you go into the server.js file and change the directory to both the powershell scripts to wherever you have them located. 
ex: const scriptPath = "C:\\Users\\name\\Desktop\\DriveMonitor.ps1";

to run the server locally, on the command line type 
-> cd my-node-project
-> node server.js

you will get a url as an output which you will paste into your browser.






