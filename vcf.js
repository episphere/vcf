console.log('vcf.js loaded')

vcf = function(url){
    // 'https://raw.githubusercontent.com/compbiocore/VariantVisualization.jl/master/test/test_files/test_4X_191.vcf
    this.url=url||'test_4X_191.vcf'
    this.date=new Date()
    this.loadMeta=_=>vcf.loadMeta(url=this.url)
    this.fetch=range=>{
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


if(typeof(define)!='undefined'){
    define(vcf)
}

