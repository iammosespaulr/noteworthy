import { BrowserWindowConstructorOptions, Event, ipcMain as ipc, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from 'electron';
import { is } from 'electron-util';
//import * as windowStateKeeper from 'electron-window-state';
import * as fs from 'fs';
//import * as mkdirp from 'mkdirp';
import * as path from 'path';
import Route from './route';

/* MAIN */

export default class Main extends Route {
	
	constructor(name="main"){
		super(name);
	}

	initMenu(){}
	load(){
		super.load();
		setTimeout(this.__didFinishLoad, 500);
	}


	/* == Cleanup ======================================= */

	cleanup(){
		super.cleanup();
		ipc.removeListener("force-close", this.__forceClose);
	}

	/* == Events ======================================== */

	events(){
		super.events();

		this.attach__blur();
		this.attach__close();
		this.attach__focus();
		this.attach__forceClose();
		this.attach__fullscreenEnter();
		this.attach__fullscreenLeave();
		this.attach__navigateUrl();
	}

	// Attach / Detach ---------------------------------- */

	attach__blur = () => 
		{ this.window.on("blur", this.__blur); }

	attach__close = () =>
		{ this.window.on("close", this.__close); }
	detach__close = () =>
		{ this.window.removeListener("close", this.__close); }

	attach__focus = () =>
		{ this.window.on("focus", this.__focus); }

	attach__forceClose = () =>
		{ ipc.on("force-close", this.__forceClose); }

	attach__fullscreenEnter = () =>
		{ this.window.on("enter-full-screen", this.__fullscreenEnter); }

	attach__fullscreenLeave = () =>
		{ this.window.on("leave-full-screen", this.__fullscreenLeave); }

	attach__navigateUrl = () =>
		{ this.window.webContents.on("new-window", this.__navigateUrl); }

	// Event Handlers ----------------------------------- */

	__blur = () => {
		this.window.webContents.send("window-blur");
	}

	__close = (event: Event) => {
		if (global.isQuitting) { return; }
		// TODO: this line comes from Notable, but it seems to
		// prevent the application from actually closing.  Why was it here?
		//event.preventDefault();
		this.window.webContents.send("window-close");
	}

	__focus = () => {
		this.window.webContents.send("window-focus");
	}

	__forceClose = () => {
		this.detach__close();
		this.window.close();
	}

	__fullscreenEnter = () => {
		this.window.webContents.send("window-fullscreen-set", true);
	}

	__fullscreenLeave = () => {
		this.window.webContents.send("window-fullscreen-set", false);
	}

	__navigateUrl = (event:Event, url:string) => {
		if (url === this.window.webContents.getURL()) { return; }
		event.preventDefault();
		shell.openExternal(url);
	}
}