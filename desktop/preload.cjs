const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
  hostServer:()=>ipcRenderer.invoke('online:host'),
  copyInvite:text=>ipcRenderer.invoke('online:copy-invite',text),
});
