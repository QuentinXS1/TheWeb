import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';

export const root=fileURLToPath(new URL('../',import.meta.url));
export const projectId=createHash('sha256').update(root.replaceAll('\\','/').replace(/\/$/,'').toLowerCase()).digest('hex');
export const previewURL='http://127.0.0.1:8091/?earth=miniature-v1';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.woff2':'font/woff2','.woff':'font/woff','.wasm':'application/wasm','.glb':'model/gltf-binary'};
export function createPreviewServer(){
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      if(pathname==='/__cm_preview__'){
        // Only this non-sensitive identity response is readable by a file page.
        res.setHeader('Access-Control-Allow-Origin','null');
        res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Private-Network','true');
        if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
        if(req.method!=='GET'){res.writeHead(405);res.end();return;}
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify({application:'theweb-preview',projectId}));return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
      if(pathname.includes('\0')||pathname.replaceAll('\\','/').split('/').some(segment=>segment.startsWith('.')||segment==='node_modules')){res.writeHead(403);res.end('Not available');return;}
      const entry=pathname==='/'||!path.extname(pathname)?'/CandidateMapper.html':pathname;
      const filename=path.resolve(root,'.'+entry);
      const relative=path.relative(root,filename);
      if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end('Not available');return;}
      const real=await fs.realpath(filename),realRelative=path.relative(await fs.realpath(root),real);
      if(realRelative.startsWith('..')||path.isAbsolute(realRelative)){res.writeHead(403);res.end('Not available');return;}
      const stat=await fs.stat(real);
      if(!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
      res.setHeader('Content-Type',mime[path.extname(real).toLowerCase()]||'application/octet-stream');
      res.setHeader('Content-Length',stat.size);res.writeHead(200);
      if(req.method==='HEAD'){res.end();return;}
      createReadStream(real).on('error',()=>res.destroy()).pipe(res);
    }catch(error){res.writeHead(error.code==='ENOENT'?404:400);res.end('Not available');}
  });
}
export async function probePreview(url='http://127.0.0.1:8091'){
  try{
    const response=await fetch(url+'/__cm_preview__',{signal:AbortSignal.timeout(1000)});
    const data=await response.json();
    return response.ok&&data.application==='theweb-preview'&&data.projectId===projectId?'ready':'other';
  }catch(error){return error?.cause?.code==='ECONNREFUSED'?'stopped':'other';}
}
function openBrowser(){
  const child=process.platform==='win32'?spawn('cmd.exe',['/d','/c','start','',previewURL],{windowsHide:true,stdio:'ignore'}):spawn(process.platform==='darwin'?'open':'xdg-open',[previewURL],{stdio:'ignore'});
  child.on('error',error=>console.error('Open '+previewURL+' in your browser. '+error.message));
}
export async function launchPreview({open=true}={}){
  const status=await probePreview();
  if(status==='other')throw new Error('Port 8091 belongs to another preview. Close that preview and run start-app.bat again.');
  if(status==='stopped'){
    const child=spawn(process.execPath,[fileURLToPath(import.meta.url)],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});
    let failure;child.on('error',error=>{failure=error;});child.unref();
    let ready=false;
    for(let i=0;i<60;i++){
      if(failure)throw failure;
      await new Promise(resolve=>setTimeout(resolve,100));
      if(await probePreview()==='ready'){ready=true;break;}
    }
    if(!ready)throw new Error('The local preview could not start. Run node scripts/preview-server.mjs to see the problem.');
  }
  if(open)openBrowser();
  console.log('Map ready: '+previewURL);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.includes('--launch'))launchPreview({open:!process.argv.includes('--no-open')}).catch(error=>{console.error(error.message);process.exitCode=1;});
  else {
    const server=createPreviewServer();
    server.on('error',error=>{console.error('Preview could not start: '+error.message);process.exitCode=1;});
    server.listen(8091,'127.0.0.1',()=>console.log('Map preview: '+previewURL));
  }
}
