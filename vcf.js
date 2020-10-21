console.log('vcf.js loaded')

vcf = function(url){
    // 'https://raw.githubusercontent.com/compbiocore/VariantVisualization.jl/master/test/test_files/test_4X_191.vcf
    this.url=url||'test_4X_191.vcf'
    this.date=new Date()
    this.loadMeta=_=>vcf.loadMeta(url=this.url)
    this.fetch=(range=[0,1000])=>{
        return vcf.fetch(range,url=this.url)
    }
}

vcf.loadMeta=function(url){ // load metadata
    //console.log(url)
    //debugger
}

vcf.fetch=(range,url)=>{
    return fetch(url,{
        headers: {
            'content-type': 'multipart/byteranges',
            'range': `bytes=${range.join('-')}`,
        }
    })
}

// hello Gus

vcf.concat=(a,b)=>{ // concatenate array buffers
    let c = new Uint8Array(a.byteLength+b.byteLength)
    c.set(new Uint8Array(a),0);
    c.set(new Uint8Array(b), a.byteLength);
    return c
}

vcf.getArrayBuffer=async(range,url)=>{
    return await (await (fetch(url,{
        headers: {
                'content-type': 'multipart/byteranges',
                'range': `bytes=${range.join('-')}`,
            }
    }))).arrayBuffer()
}


vcf.getVCFgz=async(range=[0,1000],url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    let ab = await vcf.getArrayBuffer(range,url)
    // check if seed is needed
    if(range[0]>0){
        let seed=await vcf.getArrayBuffer([0,88],url)
        ab=vcf.concat(seed,ab)
    }
    // inflate it (unzip it)
    let abi=pako.inflate(ab);
    // convert it to text
    return [...abi].map(x=>String.fromCharCode(x)).join('')
}


// Study this:
// https://github.com/GMOD/tabix-js

if(typeof(define)!='undefined'){
    define(vcf)
}

