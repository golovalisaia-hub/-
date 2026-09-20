/* Runs student-supplied Python inside a disposable module worker. No session or keys enter here. */
/* Dynamic import is important: static imports of worker dependencies use the document's worker-src CSP. */
const ready=import('https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs')
  .then(({loadPyodide})=>loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/'}));
ready.then(()=>self.postMessage({type:'ready'})).catch(error=>self.postMessage({type:'load-error',error:String(error?.message||error)}));
self.onmessage=async ({data})=>{
  const {id,code,stdin=''}=data||{};
  if(!Number.isInteger(id)||typeof code!=='string'||code.length>12000||typeof stdin!=='string'||stdin.length>3000)return;
  try{
    const py=await ready;
    py.globals.set('_academy_code',code);
    py.globals.set('_academy_stdin',stdin);
    const output=await py.runPythonAsync(`
import sys, io, contextlib, traceback
_ac_out = io.StringIO()
_ac_old_in = sys.stdin
_ac_ok = True
try:
    sys.stdin = io.StringIO(_academy_stdin)
    with contextlib.redirect_stdout(_ac_out), contextlib.redirect_stderr(_ac_out):
        try:
            exec(compile(_academy_code, '<academy>', 'exec'), {'__name__': '__main__'})
        except BaseException:
            _ac_ok = False
            traceback.print_exc(limit=3)
finally:
    sys.stdin = _ac_old_in
(_ac_ok, _ac_out.getvalue()[:12000])
`);
    const result=output.toJs();output.destroy();
    self.postMessage({type:'result',id,ok:Boolean(result[0]),output:String(result[1]||'')});
  }catch(error){
    self.postMessage({type:'result',id,ok:false,output:String(error?.message||error).slice(0,12000)});
  }
};
