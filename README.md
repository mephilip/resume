# USAA EMAIL FRAMEWORK v1.0.0

This is a boilerplate for USAA emails including templates, snippets of code, images, a css framework, and an environment for email development that allows a developer to:

1. Start from either a "MemberTemplate" or "NonMemberTemplate"
2. Find and replace invalid characters in the text doc
3. Inline CSS
4. Deploy images to our Rackspace server (used in conjuncture with sending tests to Litmus)
5. Send tests to Litmus checklists
6. Automatically zip the files up
7. Deploy the email to via FTP using gulp

#Folder Structure

- `package.json`
- `gulpfile.js` Be sure to change your FTP credentials in this file
- `.gitignore`
- `package-name.zip` a zipped file of everything in the dist folder
- **framework** 
	- **scss** 
		- `email.scss` Main scss file - Choose which folders to include
		- **settings**
			- `_variables.scss` This file controls many settings of the email like container width (580?), page margin width, colors, and more
			- `_typography.scss` Mainly font-sizes and font-families - but much more
		- **responsive** 
			- `_r-standards.scss` This file contains responsive styles like alignment and other things not grid related
			- `_r-grid.scss` This file container responsive styles pertaining the the grid
		- **partials**
			- `_usaa-divider.scss` the gold and blue USAA divider right before the footer
			- `_super-header.scss` the styles for the pretext and view in web link
			- `_header.scss` styles for the header with the logo and security zone
			- `_footer.scss` styles for the footer
		- **grid**
			- `_grid-pm.scss` The grid based off the page margin variable
			- `_grid-fw.scss` The grid based off the full width variable
		- **components**
			- `_content.scss` Color of the content container
			- `_compatibility-standards.scss` A lot of classes making things work on different email clients
			- `_colors.scss` All the color classes in the framework
			- `_body.scss` Background color and a few other standards for the body of the email.
- **dev** All work on the email html is done in this folder
	- **text-versions** This is where you put all text versions of the email
	- `_MemberTemplate.html` This is the template with the Security Zone
	- `_NonMemberTemplate.html` No security zone here
	- **images** folder containing images
	- **snippets** folder filled with html files containing various snippets of code
	- **css** folder containing the css to be inlined
- **dist**
	- `package-name.html` The compile version of the email
	- `package-name.txt` The clean version of the text doc
	- **images**
- **litmus**
	- `package-name.html` A compiled version of the email that uses Rackspace sourced images (this is the only difference between this file and the dist file).


# STEPS

1. Fork this repository. Be sure to fork it under USAA EMAILS, use the correct filename of the email, and make sure "Enable fork syncing" is not checked.
2. Use "git clone <repository_url>" to clone your new repository.
3. Make sure you change the name, date, and subject (optional) in the package.json file. This is super important because this is what determines what your zip file will be called, where the images will be deployed on Rackspace, and where on the email-testing server your email will be deployed.
4. Run npm install
5. Place the text version in the text-versions folder
6. Choose a template to start with and rename the file

# Common Git Commands

**git status** Frequently use this command to show the working tree status
**git fetch** Download objects and refs from another repository. Use this command first if you are trying to get the status of the remote compared to your local branch.
**git pull** Incorporates changes from a remote repository into the current branch.
**git add** This command updates the index using the current content found in the working tree, to prepare the content staged for the next commit. 
**git commit** Stores the current contents of the index in a new commit along with a log message from the user describing the changes.
**git push** Update remote refs along with associated objects

# Gulp Tasks

**gulp dist** Builds all of the production files. Tasks within this task include:
 - emailBuilder: inlines all of the CSS among other things.
 - imagemin: minimizes all of the emails
 - txtclean: rid the text docs of invalid characters.
 - sass: compiles the scss in css

**gulp cloudfiles** simply loads all of the images to a rackspace server so that they can be hosted somewhere when sending test emails either to litmus or to your inbox.

**gulp litmus** Creates a `litmus` folder from which it sends the contents to Litmus (which can be seen in the Litmus checklist). This task also includes: 
 - prepLitmus: replaces the source of the images with images sources from rackspace.
 - cloudfiles: loads up the files to rackspace.
 
 **gulp send** use --emailaddress@url.tld as the option (or create an alias in the gulpfile to send it to multiple email addresses).
 
 **gulp deploy** deploys everything to the FTP folder. If you have credentials, please add them in the gulp file.