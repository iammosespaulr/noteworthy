// project imports
import FSAL from "@main/fsal/fsal";
import * as FSALDir from "@main/fsal/fsal-dir";
import { IDirectory, IFileMeta, IDirEntryMeta } from "@common/fileio";
import { WorkspacePlugin } from "@main/plugins/plugin";
import { CrossRefPlugin } from "@main/plugins/crossref-plugin";
import { Workspace } from "./workspace";

// node.js imports
import * as pathlib from "path";
import { EventEmitter } from "events";

////////////////////////////////////////////////////////////

export enum WorkspaceEvent {
	FILETREE_CHANGED = "filetree-changed",
}

export class WorkspaceService extends EventEmitter {
	_workspace:Workspace|null;

	constructor(private _fsal:FSAL) {
		super();

		// on startup, there is no workspace open
		this._workspace = null;
	}

	// == Directory ===================================== //

	getWorkspaceDir(): (IDirectory | null) {
		return this._workspace && this._workspace.dir;
	}

	async setWorkspaceDir(dirPath:string):Promise<boolean>{
		console.log("app :: setWorkspaceDir() ::", dirPath);
		// close active workspace
		this.closeWorkspace();
		
		// define plugins
		let plugins: WorkspacePlugin[] = [
			new CrossRefPlugin()
		];

		// get directory info
		/** @todo (9/12/20) replace static call with "FsalService" object
		 * > might help to make dependencies more clear
		 * > more mockable
		 */
		let dir:IDirectory = await FSALDir.parseDir(dirPath);

		// load (possibly stale) workspace metadata from file
		/** @todo (9/12/20) replace static call with "WorkspaceService" object
		 * > might help to make dependencies more clear
		 * > more mockable
		 */
		this._workspace = await Workspace.fromDir(dir, plugins, true);
		if (!this._workspace) {
			console.error("fsal :: unknown error opening workspace")
			return false;
		}

		// watch workspace directory
		this._fsal.watch(dir.path);

		// check for changes between current file list and saved metadata,
		// and process added/changed/deleted files if needed
		let result = await this._workspace?.update();

		// emit change event
		/** @todo (9/13/20) type-checked workspace events */
		this.emit(WorkspaceEvent.FILETREE_CHANGED, this.getFileTree());
		return true === result;
	}

	get workspace():Workspace|null {
		return this._workspace;
	}

	async closeWorkspace(persist:boolean = true): Promise<boolean> {
		if(!this._workspace){ return true; }
		this._fsal.unwatch(this._workspace.dir.path);
		this._fsal.unloadAll();
		this._workspace.close(persist);
		this._workspace = null;
		return true;
	}

	// == Files / Paths ================================= //

	getFileByHash(hash: string): (IFileMeta | null) {
		if (!this._workspace) { return null; }
		return this._workspace.getFileByHash(hash);
	}

	getFileTree(): IDirEntryMeta[] {
		// handle empty workspace
		if (!this._workspace) { return []; }
		return this._workspace.getFileTree();
	}

	/**
	 * Convert a workspace-relative path to an absolute path.
	 * @returns An absolute path, or NULL if no workspace exists.
	 */
	resolveWorkspaceRelativePath(relPath: string): string | null {
		let workspacePath = this.getWorkspaceDir()?.path;
		if (!workspacePath) { return null; }

		/** @todo (6/27/20) error if the resulting abs path
		 * is not inside the workspace (e.g. if relPath="../../..")
		 */
		relPath = pathlib.normalize(relPath);
		return pathlib.join(workspacePath, relPath);
	}

}