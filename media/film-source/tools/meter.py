import sys, subprocess, numpy as np
SR=48000
KW=('biquad=b0=1.53512485958697:b1=-2.69169618940638:b2=1.19839281085285:a0=1:a1=-1.69065929318241:a2=0.73248077421585,'
    'biquad=b0=1:b1=-2:b2=1:a0=1:a1=-1.99004745483398:a2=0.99007225036621')
def loadk(p):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-af',KW,'-ac','2','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,np.float32).reshape(-1,2).astype(np.float64)
def momentary(y, hop=0.1, win=0.4):
    s=(y**2).sum(axis=1); c=np.concatenate([[0],np.cumsum(s)])
    n=int(win*SR); h=int(hop*SR)
    idx=np.arange(0,len(s)-n,h)
    ms=(c[idx+n]-c[idx])/n
    return np.stack([idx/SR+win, -0.691+10*np.log10(ms+1e-12)],1)
if __name__=='__main__':
    files=sys.argv[1:]
    M=[momentary(loadk(f)) for f in files]
    print('   t  '+' '.join(f'{f.split("/")[-1][:9]:>9s}' for f in files))
    for i in range(0,len(M[0]),5):
        print(f'{M[0][i,0]:5.1f} '+' '.join(f'{m[i,1]:9.1f}' for m in M))
