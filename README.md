Web Systems and Technology<br>
MO-IT161 - Group 8<br>
Milestone 2
<br>
<br>
Members :<br> 
Giannros Peralta<br>
Marcelyn Madanlo<br>
Mark Anthony Goyon<br>
Daniel Cotoner<br>
<br>
Documentation : <br>
AI-Use Statement : <br>https://docs.google.com/document/d/1FEDGw5IG1r7O3eRKrWmEwAaLR87Xbddr/edit?usp=sharing&ouid=110694898123760881684&rtpof=true&sd=true<br>
Development Worksheet : <br>https://docs.google.com/spreadsheets/d/1s5irJ8kUzLtCR2jZjpLytK53Gpbsq4I_/edit?usp=sharing&ouid=110694898123760881684&rtpof=true&sd=true<br><br>
Project - ProcureIT<br>
<br>
Log-in Credentials : <br>
username : staffprocureit / password : staff123<br>
username : approverprocureit / password : approver123<br>
username : managerprocureit / password : manager123<br>
<br>
Description :<br>
A paperless procurement solution for a BPO's IT Department, it replaces forms and spreadsheets 
with an end-to-end digital process for managing/tracking assets like laptops, desktops, headsets
and IT equipment. Handles hardware requests, manager approvals, deployment, repairs, and device 
returns. Gives staff, managers, and IT staff a system to request, approve, and track every item 
from procurement to return/disposal. It also helps meet 5S standards by clearing out paper-trails 
and keeping hardware records organized in one place.<br>
<br>
Active html pages :<br>
- Dashboard
- Requisition
- Approval
- Purchase Order
- Purchase Order Detail
- Delivery
<br><br>
Instructions for testing Nodejs and MongoDB :
1. Get the project. Import the project and open on VSCode<br>
2. Install packages. Open terminal in VSCode and run "npm install"<br>
3. Create .env file. Create a new file named ".env"<br>
4. Setup env. In the .env file, it must contain : <br>
	"PORT=3000<br>
	 MONGODB_URI=mongodb://127.0.0.1:27017/procureit"<br>
5. Run "npm start" in terminal<br>
6. Open a browser and go to : http://localhost:3000
<br>
Implemented Functions : Milestone 2 <br>
- Log-In credentials (demo accounts) with different user roles: staff / supervisor / manager<br>
- Workflow Stepper shows in which process the user is currently working on<br>
- Dashboard Counter reflects workflow process, shows accurate number of pending, approved and active processes<br>
- Functional workflow from Dashboard to Delivery Receipt creation. (Invoice Processing, Vendor Management,<br>
  Inventory /Asset Management and Reports are currently not functional. )<br>
- Requisition Ids, PO Numbers and DR Numbers are auto-generated for data continuity<br>
- Purchase Order implements automatic calculation of prices together with VAT and input for other fees.<br>
- Back-end implementation via Node.js<br>
- Used MongoDB as the web app's database<br>
- Minor implementation of Bootstrap on active pages<br>
