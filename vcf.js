console.log('vcf.js loaded')

vcf = function (url){
    // 'https://raw.githubusercontent.com/compbiocore/VariantVisualization.jl/master/test/test_files/test_4X_191.vcf
    this.url=url||'test_4X_191.vcf'
    this.date=new Date()
    let that=this;
    this.size=vcf.fileSize(url).then(sz=>{that.size=sz})  // promise
    this.fetch=async(range=[0,1000])=>{
        let sufix = url.match(/.{3}$/)[0]
        switch(url.match(/.{3}$/)[0]) {
          case '.gz':
            return await vcf.getVCFgz(range,url=this.url)
            break;
          case 'tbi':
            return (await vcf.getTbi(url=this.url)).slice(range[0],range[1])
            break;
          default:
            return await (await vcf.fetch(range,url=this.url)).text()
        }
    }
}

vcf.fetch=(range,url)=>{
    return fetch(url,{
        headers: {
            'content-type': 'multipart/byteranges',
            'range': `bytes=${range.join('-')}`,
        }
    })
}

vcf.gzKey=[31, 139, 8, 4, 0, 0, 0, 0, 0, 255, 6, 0, 66, 67, 2, 0]

vcf.concat=(a,b)=>{ // concatenate array buffers
    let c = new Uint8Array(a.byteLength+b.byteLength)
    c.set(new Uint8Array(a),0);
    c.set(new Uint8Array(b), a.byteLength);
    return c
}

vcf.getArrayBuffer=async(range=[0,1000],url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    return await (await (fetch(url,{
        headers: {
                'content-type': 'multipart/byteranges',
                'range': `bytes=${range.join('-')}`,
            }
    }))).arrayBuffer()
}


vcf.getVCFgz=async(range=[0,1000],url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    //let ab = await vcf.getArrayBuffer(range,url)
    let ab = await (await vcf.fetch(range,url)).arrayBuffer()
    return pako.inflate(ab,{"to":"string"});
}

vcf.getTbi=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All_papu.vcf.gz.tbi')=>{
    const bf = pako.inflate(await (await fetch(url)).arrayBuffer())
    return [...bf].map(x=>String.fromCharCode(parseInt(x))).join('')
}

vcf.index=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    // index chunk locations and Chr:pos
    idx={
        chunks:[],
        chrPos:[]
    }
    // find size of file
}

vcf.fileSize=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    let response = await fetch(url);
    const reader = response.body.getReader();
    const contentLength = response.headers.get('Content-Length');
    return parseInt(contentLength)
}

// Study this:
// https://github.com/GMOD/tabix-js


if(typeof(define)!='undefined'){
    define({proto:vcf})
}

if(typeof(pako)=="undefined"){
    try{
        let s = document.createElement('script')
        s.src="https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.11/pako.min.js"
        document.head.appendChild(s)
    }catch(err){
        console.log('pako not loaded')
    }
}



