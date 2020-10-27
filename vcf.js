console.log('vcf.js loaded')

vcf = function (url){
    // 'https://raw.githubusercontent.com/compbiocore/VariantVisualization.jl/master/test/test_files/test_4X_191.vcf
    this.url=url||'test_4X_191.vcf'
    this.date=new Date()
    let that=this;
    this.size=vcf.fileSize(url);  // await v.size will garantee one or the other
    (async function(){that.size=await that.size})(); // fullfill promise asap
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
    this.indexGz=async(url=this.url)=>{
        that.indexGz=await vcf.indexGz(url,size=await that.size) // note how the indexGz function is replaced by the literal result
        return that.indexGz
    }
    this.indexGz2=vcf.indexGz(url,that.size) // note how the indexGz function is replaced by the literal result
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

vcf.indexGz=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180531_papu.vcf.gz',size)=>{
    // index chunk locations and Chr:pos
    let idx={
        chunks:[],
        chrPos:[]
    }
    // find size of file
    idx.size = await size || await vcf.fileSize(url)
    idx.step=10000000
    for(let i=0;i<idx.size;i+=idx.step){
        let iNext = i+idx.step
        if(iNext>=idx.size){iNext=idx.size-1}
        let arr = await vcf.getArrayBuffer([i,iNext],url)
        arr = new DataView(arr)
        arr = [...Array(arr.byteLength)].map((x,i)=>arr.getUint8(i))
        let mtx=vcf.matchKey(arr,key=vcf.gzKey)
        mtx.forEach(x=>{idx.chunks.push(i+x)})
        console.log(i,mtx)
        //debugger
    }

    return idx
}

vcf.matchKey=(arr,key=vcf.gzKey)=>{
    let ind=arr.map((x,i)=>i) // the indexes
    key.forEach((k,j)=>{
        ind=ind.filter(i=>arr[i+j]==k)
    })
    return ind
}

vcf.fileSize=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    let response = await fetch(url,{
        method:'HEAD'
    });
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
