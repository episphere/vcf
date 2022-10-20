console.log('vcf.js loaded')

//vcf = function (url='test_4X_191.vcf'){
vcf = function (url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz',keyGap,chrCode=vcf.chrCode){
//vcf = function (url='https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz'){
    //vcf = function (url='clinvar_20201226.vcf.gz'){
    // 'https://raw.githubusercontent.com/compbiocore/VariantVisualization.jl/master/test/test_files/test_4X_191.vcf
    //this.url=url||
    this.url=url
    this.date=new Date()
    let that=this;
    this.size=vcf.fileSize(url);  // await v.size will garantee one or the other
    this.indexGz=async(url=this.url)=>{
        that.indexGz=await vcf.indexGz(url,size=await that.size) // note how the indexGz function is replaced by the literal result
        return that.indexGz
    }
    this.query=async function(q='1,10485'){
		return await vcf.query(q,fun=vcf.funDefault,that)
	}
    //this.getChrCode = async ()=>vcf.getChrCode(that)
    this.getArrayBuffer=async(range=[0,1000],url=this.url)=>{
    	return vcf.getArrayBuffer(range,url)
    }
    this.keyGap=keyGap||vcf.keyGap
    this.chrCode=chrCode
	if(typeof(chrCode)=="string"){
		if(chrCode.match(/\w+-\w+/)){
			let range = chrCode.match(/\w+-\w+/)[0].split('-').map(x=>parseInt(x))
			let rangeTxt=`${range[0]}`
			for (var i = range[0]+1;i<=range[1];i++){
				rangeTxt+=`,${i}`
			}
			this.chrCode=chrCode.replace(/\w+-\w+/,rangeTxt)
			//debugger
		}
		this.chrCode=this.chrCode.split(',')
	}
    this.fetchGz = async(range=[0,1000],url=this.url)=>{
    	let res = await vcf.fetchGz(range,url)
    	// record index, unlike vcf.fetchGz
    	vcf.idxx(this,res)
    	//debugger
    	return res
    }

    this.fetch=async(range=[0,1000])=>{
    	/*
        let sufix = url.match(/.{3}$/)[0]
        switch(url.match(/.{3}$/)[0]) {
          case '.gz':
            return await vcf.fetchGz(range,url=this.url)
            break;
          case 'tbi':
            return (await vcf.getTbi(url=this.url)).slice(range[0],range[1])
            break;
          default:
            return await (await vcf.fetch(range,this.url)).text()
        }
        */

        // check or retrieve header
        if(!this.meta){
        	await vcf.meta(this)
        }


        let res = await vcf.fetchGz(range,url=this.url)
        return res
    };

    //this.query=async q=>await vcf.query(q,that)

    (async function(){ // fullfill these promises asap
    	that.size=await that.size
    	that.key=await (await vcf.fetch([0,15],that.url)).arrayBuffer()
    	const dv = new DataView(that.key)
        that.key = [...Array(dv.byteLength)].map((x,i)=>dv.getUint8(i)) // pick key from first 16 integers
        await vcf.meta(that) // extract metadata
        await vcf.tail(that)
    })(); 
    
    //this.indexGz2=vcf.indexGz(url,that.size) // note how the indexGz function is replaced by the literal result
}

vcf.fetch=(range,url)=>{
	range[0]=Math.max(range[0],0) // to stay in range
    //console.log(range)
    return fetch(url,{
        headers: {
            'content-type': 'multipart/byteranges',
            'range': `bytes=${range.join('-')}`,
        }
    })
}

vcf.gzKey=[31, 139, 8, 4, 0, 0, 0, 0, 0, 255, 6, 0, 66, 67, 2, 0]
// just an example of a key, better retrieve it from the first 16 integers of the array buffer
vcf.keyGap=20000-1
vcf.chrCode='1-22,X,Y,XY,MT,0'
vcf.concat=(a,b)=>{ // concatenate array buffers
    let c = new Uint8Array(a.byteLength+b.byteLength)
    c.set(new Uint8Array(a),0);
    c.set(new Uint8Array(b), a.byteLength);
    return c
}

vcf.meta= async that=>{ // extract metadata
	let ini = await vcf.fetchGz([0,500000],that.url) // this should probably have the range automated to detect end of header
	let arr = ini.txt.split(/\n/g)
    that.meta=arr.filter(r=>r.match(/^##/))
    that.cols=arr[that.meta.length].slice(1).split(/\t/) // column names
    console.log(`Columns: ${that.cols}`)
    let vals = arr[that.meta.length+1].split(/\t/g)
    //that.idxx = that.idxx || [{ki:0,chr:parseInt(vals[0]),pos:parseInt(vals[1])}]
    vcf.idxx(that,ini)
    return that.meta
}

vcf.tail=async that=>{ // to be run after vcf.meta, to find tail indexes to extablish span
	if(!that.meta||!that.idxx){
		await vcf.meta(that)
	}
	let ini = await vcf.fetchGz(that.size-that.keyGap)
	vcf.idxx(that,ini)
	//debugger
}

vcf.idxx=(that,ini)=>{ // index decompressed content
    //console.log('indexed ini:',ini)
    // extract data rows
    let dt = ini.txt.split(/\n/g).filter(x=>!x.match(/^#/)).map(r=>r.split(/\t/g))
    //console.log('dt:',dt)
    // find first full row
    if(dt.length<2){
    	//debugger
    }
    if(dt.length>1){
    	let firstRow = dt[0]
		if(firstRow.length!=dt[1].length){ // if first and second rows have different numbers of columns
			firstRow=dt[1]
		}
		// find last full row
		let lastRow=dt.slice(-2,-1)[0]
		that.idxx = that.idxx || []
		that.ii00 = that.ii00 || []
		//if(that.idxx.length>0){
		//let ii00 = that.idxx.map(x=>x.ii[0]) // maybe we should keep this
		if(!that.ii00.includes(ini.idx[0])){ // if this is new
			that.ii00.push(ini.idx[0]) // update index of start indexes
			that.idxx.push({
				ii:ini.idx,
				//chrStart:vcf.parseInt(firstRow[0]),
				//chrEnd:vcf.parseInt(lastRow[0]),
				chrStart:firstRow[0],
				chrEnd:lastRow[0],
				posStart:parseInt(firstRow[1]),
				posEnd:parseInt(lastRow[1]),
				dt:dt
			}),
			that.idxx=vcf.sortIdxx(that.idxx)
			that.ii00=that.ii00.sort()
		}
    }
		
    //}
			
    //debugger
}

vcf.parseInt=x=>{
	if(x.match(/^\d+$/)){
		return parseInt(x)
	}else{
		return x
	}
}

vcf.query= async function(q='1,10485',fun=vcf.funDefault,that){
	// read chrCode into array
	//if(typeof(that.chrCode)=='string'){
	//	that.chrCode=that.chrCode.split(',')
	//}
	if(typeof(q)=='string'){ // chr,pos
		q=q.split(',') // chr kept as string
		q[1]=parseFloat(q[1]) // pos converted into number
	}
	q[0]=that.chrCode.indexOf(q[0]) // chr converted into index if chrCode array
	q=q.map(qi=>qi.toString()) // makign sure the elements of the query array are strings
	// start iterative querying
	console.log(`range search for (${q})`)
	// 1 -  find bounds
	//let n = that.idxx.length
	let val=[]
	let i=0
	let j=0
	while(i<that.idxx.length){
		//val=[] // reset every try
		j=j+1
		if(j>5){
			break
		}
		let chrStart = that.chrCode.indexOf(that.idxx[i].chrStart) // the index of the chromossome, not the chromossome 
		let posStart = that.idxx[i].posStart
		let chrEnd = that.chrCode.indexOf(that.idxx[i].chrEnd)
		let posEnd = that.idxx[i].posEnd
		if (chrStart<=q[0]){ // below or at start chr target
			if(posStart<=q[1]){ // below or at pos target for that chr
				console.log(`range #${i} lower bound: ${that.idxx[i].chrStart},${posStart} <= (${that.chrCode[q[0]]},${q[1]})`)
				// Check upper boundary
				if (chrEnd<=q[0]){ // below or at end chr target
					if(posEnd>=q[1]){ // below or at pos target for that chr
						console.log(`range #${i} upper bound: ${that.idxx[i].chrEnd},${posEnd} => (${that.chrCode[q[0]]},${q[1]})`)
						console.log('range found! looking for value within range')
						//that.idxx[i].dt.filter(r=>r[0]==that.chrCode[q[0]]).filter(r=>parseInt(r[1])==q[1])
						let matches=that.idxx[i].dt.filter(r=>r[0]==that.chrCode[q[0]]).filter(r=>r[1]==q[1])
						if(matches.length!=0){
							matches.forEach(mtxi=>val.push(matches))	
						}
					}else{
						console.log('out of range') // find out if a new reading is needed
						if(i!=(that.idxx.length-1)){ // this is not the end range 
							let nextChrStart = that.chrCode.indexOf(that.idxx[i+1].chrStart) // the index of the chromossome, not the chromossome 
							let nextPosStart = that.idxx[i+1].posStart
							let gap=false
							if(nextChrStart>parseInt(q[0])){
								gap=true
							}else if((nextChrStart==parseInt(q[0]))&(nextPosStart>parseInt(q[1]))){
								gap=true
							}
							if(gap){
								await that.fetchGz(Math.round((that.ii00[i]+that.ii00[i+1])/2))
								//i=i-1
							}
							//if(nextChrStart==parseInt(q[0])&(nextPosStart>))
							debugger
						}else{
							console.log(`#${i} - this was the last range`)
						}
					}
				}
			}
		}
		i++
	}
	return val
}
	/*
	 for(var i = 0;i<n;i++){
		if (that.chrCode.indexOf(that.idxx[i].chrStart)<=q[0]){ // below or at start chr target
			if(that.idxx[i].posStart<=q[1]){ // below or at pos target for that chr
				console.log(`${i} lower bound: ${that.idxx[i].chrStart},${that.idxx[i].posStart} <= (${that.chrCode[q[0]]},${q[1]})`)
				// Check upper boundary
				if (that.chrCode.indexOf(that.idxx[i].chrEnd)<=q[0]){ // below or at end chr target
					if(that.idxx[i].posEnd>=q[1]){ // below or at pos target for that chr
						console.log(`${i} upper bound: ${that.idxx[i].chrEnd},${that.idxx[i].posEnd} => (${that.chrCode[q[0]]},${q[1]})`)
					}
				}
			}
		}
	}
 */


vcf.funDefault=function(q1,q2){ // default query sorting function
	debugger
}

vcf.getChrCode=async(that)=>{ // extract chrCode
    that.chrCode = [that.idxx[0].chrStart]
    stop=false
    let j=0
    let iterate = async function(i=parseInt(that.keyGap/2),step=that.keyGap/2){
    	j=j+1
    	step=Math.round(step)
    	if(stop){
    		debugger
    	}
    	ini = await that.fetchGz(Math.min(i,that.size-1))
    	let dt = ini.txt.split(/\n/g).filter(x=>!x.match(/^#/)).map(r=>r.split(/\t/g))
    	if(dt[0][0].length>0){
    		let firstRow = dt[0]
			if(dt[1]){
				if(firstRow.length!=dt[1].length){ // if first and second rows have different numbers of columns
					firstRow=dt[1]
				}
			}

			let lastRow=dt.slice(-2,-1)[0]
			console.log(j,i,step,[firstRow[0],lastRow[0]],that.chrCode)
			//debugger
			if(i<that.idxx.slice(-1)[0].ii.slice(-2,-1)[0]){
				if(lastRow[0]==that.chrCode.slice(-1)[0]){ // if new end chr same as the last one 
					step=Math.round(step*(1+5*Math.random()))
					iterate(i+step,step)
				}else{
					//debugger
					if(firstRow[0]==that.chrCode.slice(-1)[0]){ // if read starts with one chr and ends with the other
						that.chrCode.push(lastRow[0])
						if(lastRow[0]!=that.idxx.slice(-1)[0].chrEnd||j<1000){ // if it is not the lars chr
							iterate(i)
						}else{
							return that
						}					
					}else{
						//step=Math.round(-0.5*step)
						//iterate(i-step,Math.round(that.keyGap/(4+Math.random()))) // take a step back and start again
						iterate(i-step,Math.round(100+that.keyGap*Math.random()))
					}
				}
			}else{
				//iterate(i-step,Math.round(that.keyGap/(4+Math.random()))) // out of bounds, take a step back
				iterate(i-step,Math.round(100+that.keyGap*Math.random()))
			}
    	}			
    }
    iterate()
	return that.chrCode
}

/*
vcf.idxx=(that,ini)=>{ // index decompressed content
    console.log('indexed ini:',ini)
    that.idxx = that.idxx || [{ki:0,chr:0,pos:0}] //{ki:[],chr:[],pos:[]} // indexing (ki) chromossome (chr) and position (pos) in the first full row after decompression key
    let n=ini.arrBuff.byteLength // length of array buffer slice
    let maxLine=2000 // maximum length of VCF row
    ini.idx.forEach((i,k)=>{
    //let i = ini.idx[0] // do only the first key match per set
    	let j=1 // first full position
    	let arr=[] // array of stringified rows after kth key match
    	if(k==0){
    		arr = ini.txt.split(/\n/g)
    	} else if((n-i)>maxLine){
    		let text_i=pako.inflate(ini.arrBuff.slice(i,i+maxLine),{"to":"string"})
    		arr = text_i.split(/\n/g)
    	}
    	let dt=arr.filter(r=>!r.match(/^#/)).map(a=>a.split(/\t/)) // it will be [] in none matches
    	if(dt.length>0){
    		if(dt[0].length==dt[1].length){j=0} // the first row is complete
			if(!that.idxx.map(x=>x.ki).includes(i)){ // skip repeats
				that.idxx.push({ki:i,chr:parseInt(dt[j][0]),pos:parseInt(dt[j][1])})
			}
    	}else{
    		console.log(`empty array at i=${i} with ini=`,ini)
    	}	
    	that.idxx=vcf.sortIdxx(that.idxx)
    }) // add new indes of keys
    // data only
    //let arr = ini.txt.split(/\n/g)
    //let dt=arr.filter(r=>!r.match(/^#/)).map(a=>a.split(/\t/)) // it will be [] in none matches
	//debugger
}
*/

vcf.sortIdxx=(idxx)=>{
	return idxx.sort((a,b)=>(a.ii[0]-b.ii[0]))
}

//vcf.getArrayBuffer=async(range=[0,1000],url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
vcf.getArrayBuffer=async(range=[0,1000],url='test_4X_191.vcf')=>{
    return await (await (fetch(url,{
        headers: {
			'content-type': 'multipart/byteranges',
			'range': `bytes=${range.join('-')}`,
		}
    }))).arrayBuffer()
}


vcf.fetchGz=async(range=0,url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz',keyGap=vcf.keyGap)=>{
    //let ab = await vcf.getArrayBuffer(range,url)
    // modulate range
    if(typeof(range)=="number"){
    	range = [range,range+keyGap]
    }
    if((range[1]-range[0])<keyGap){
    	range = [range[0],range[0]+keyGap]
    }
    
	// start at the previous inflatable key
    //let rr = range // floored range
    //rr[0]=Math.max(0,rr[0]-keyGap/2) // keyGap has to be an even integer
    //const ab = await (await vcf.fetch(rr,url)).arrayBuffer()
    
    // start at next inflatable key
    const ab = await (await vcf.fetch(range,url)).arrayBuffer()
    const dv = new DataView(ab)
    const it = [...Array(dv.byteLength)].map((x,i)=>dv.getUint8(i)) // as integers
    const id = vcf.matchKey(it.slice(0,keyGap))
    //console.log(`id = [${id}]\nit.length = ${it.length}`)
    let res = {
    	txt:pako.inflate(ab.slice(id[0]),{"to":"string"}),
    	arrBuff:ab,
    	idx:id.map(v=>v+range[0]),
    	range:range,
    	url:url
    }
    /*
    id.push(it.length)
    id.slice(0,-1).forEach((idi,i)=>{
    	res.txt[i]=pako.inflate(ab.slice(id[0]),{"to":"string"})
    })
    */

    return res
}

vcf.getTbi=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All_papu.vcf.gz.tbi')=>{
    const bf = pako.inflate((await (await fetch(url)).arrayBuffer()),{to:'arraybuffer'})
    const dv = new DataView(bf.buffer)
    return dv
    //return [...bf].map(x=>String.fromCharCode(parseInt(x))).join('')
}

vcf.indexGz=async(url='https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar_20201026.vcf.gz',size)=>{
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
        mtx=mtx.map(x=>i+x)
        mtx.forEach(x=>{
            idx.chunks.push(x)
            let n = 1000
            if(i+x==0){n=100000}
            let txt=pako.inflate(arr.slice(x-i,x+n-i),{to:'string'})
            txts = txt.split(/\n(\w+\t+\w+)/)
            let chrPos = [null,null]
            if(txts.length>1){
                chrPos=txts[1].split(/\t/).map(x=>parseInt(x))
            }
            idx.chrPos.push(chrPos)
        })
        console.log(`${Date().slice(4,24)} ${Math.round(100*i/idx.size)}% : [ ${mtx.slice(0,3).join(' , ')} ... (${mtx.length})]`)
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

vcf.compressIdx=function(idx,filename){
    // string it
    //let xx = pako.deflate(idx.chunks.concat(idx.chrPos.map(x=>x[0]).concat(idx.chrPos.map(x=>x[1]))))
    let xx = pako.gzip(idx.chunks.concat(idx.chrPos.map(x=>x[0]).concat(idx.chrPos.map(x=>x[1]))))
    if(filename){
        vcf.saveFile(xx,filename)
    }
    return xx
}

vcf.readIdx=async function(filename='idx.gz'){ // read compressed idx index
    //let xx = (await fetch(filename)).
}

vcf.fileSize=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    let response = await fetch(url,{
        method:'HEAD'
    });
    const reader = response.body.getReader();
    const contentLength = response.headers.get('Content-Length');
    return parseInt(contentLength)
}

vcf.saveFile=function(x,fileName) { // x is the content of the file
	// var bb = new Blob([x], {type: 'application/octet-binary'});
	// see also https://github.com/eligrey/FileSaver.js
	var bb = new Blob([x]);
   	var url = URL.createObjectURL(bb);
	var a = document.createElement('a');
   	a.href=url;
   	a.download=fileName
	a.click()
	return a
}

vcf.loadScript= async function(url){
	console.log(`${url} loaded`)
    async function asyncScript(url){
        let load = new Promise((resolve,regect)=>{
            let s = document.createElement('script')
            s.src=url
            s.onload=resolve
            document.head.appendChild(s)
        })
        await load
    }
    // satisfy dependencies
    await asyncScript(url)
} 

// Study this:
// https://github.com/GMOD/tabix-js


if(typeof(define)!='undefined'){
    define({proto:vcf})
}

if(typeof(pako)=="undefined"){
	vcf.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.11/pako.min.js')
}


// testing
v = new vcf('https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh37/clinvar.vcf.gz')
// (await v.fetchGz(59001026)).txt.split(/\n/).slice(1).map(x=>x.split(/\t/))[0]
// (await v.fetchGz(20000000)).txt.split(/\n/).slice(1).map(x=>x.split(/\t/))[0]
