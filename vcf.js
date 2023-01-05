console.log('vcf.js loaded')

/* Initializes object with default example parameters */
vcf={}
vcf.gzKey=[31,139,8,4,0,0,0,0,0,255,6,0,66,67,2,0]
vcf.keyGap=20000-1
vcf.chrCode='1-22,X,Y,XY,MT,0'

/**
 * Main global portable module.
 * @namespace 
 * @property {Function} Vcf - {@link Vcf}
 *
 * @namespace vcf
 * @property {Function} fetchRange - {@link vcf.fetchRange}
 * @property {Function} getMetadata - {@link vcf.getMetadata}
 * @property {Function} getTail - {@link vcf.getTail}
 * @property {Function} getIndexes - {@link vcf.getIndexes}
 * @property {Function} query - {@link vcf.query}
 * @property {Function} queryInBatch - {@link vcf.queryInBatch}
 * @property {Function} sortIdxx - {@link vcf.sortIdxx}
 * @property {Function} getArrayBuffer - {@link vcf.getArrayBuffer}
 * @property {Function} fetchGz - {@link vcf.fetchGz}
 * @property {Function} matchKey - {@link vcf.matchKey}
 * @property {Function} compressIdx - {@link vcf.compressIdx}
 * @property {Function} fileSize - {@link vcf.fileSize}
 * @property {Function} saveFile - {@link vcf.saveFile}
 * @property {Function} saveQueryResult - {@link vcf.saveQueryResult}
 * @property {Function} loadScript - {@link vcf.loadScript}
 */
 
 /**
 *
 *
 * @object Vcf
 * @attribute {string} url The vcf file url.
 * @attribute {Date} date Date object that the object was created.
 * @attribute {number} keyGap The gap length between keys.
 * @attribute {string} chrCode Chromosomes that will be used (Ex.: '2' or '1-22' or '1-22,X,Y,XY,MT' or 'X,Y').
 * @attribute {number} size Vcf file total size.
 * @attribute {Object} lastQueryResult Search result object, containing the following attributes: hit - array containing the vf table lines with the SNPs found in the chromosome an dposition searched, range - the object with the specific chunk content in which the search obtained hits (same attributes as one of the idxx attribute items found in the Vcf main library object).
 * @attribute {array} gzKey Vcf file compression chunk indexes.
 * @attribute {array} meta Metadata lines.
 * @attribute {array} cols Table columns identifying the data items.
 * @attribute {array} ii00 Chunk Byte start indexes.
 * @attribute {array} idxx Array of objects concerning the chunk contents, each of these containing the following attributes: chrStart - start chromosome, chrEnd - end chromosome, dt - list of the vcf table containing the SNPs information in the range of chromosome and positions, posStart - Start position in the start chromosome, posEnd - End position in the end chromosome, ii - Byte slice indexes.
 * @attribute {Function} indexGz Same as vcf.indexGz
 * @attribute {Function} query Same as vcf.query
 * @attribute {Function} queryInBatch Same as vcf.queryInBatch
 * @attribute {Function} getArrayBuffer Same as vcf.getArrayBuffer
 * @attribute {Function} fetchGz Same as vcf.fetchGz
 * @attribute {Function} fetchRange Same as vcf.fetchRange
 * @attribute {Function} saveQueryResult Save the results of the last query into a tabulated file using the function vcf.saveFile
 */

class VcfObject {
    constructor(url, keyGap, chrCode){
        this.url=url.replace('http://', 'https://')
        
        this.date=new Date()
        this.keyGap=keyGap||vcf.keyGap
        this.lastQueryResult = null
        
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
    }
    
    async indexGz (url=this.url) {
        this.indexGz=await vcf.indexGz(url,size=await this.size) // note how the indexGz function is replaced by the literal result
        return this.indexGz
    }
    async query(q='1,10485'){
		return await vcf.query(q, this)
	}
    async queryInBatch(query){
		return await vcf.queryInBatch(query, this)
	}
    async getArrayBuffer(range=[0,1000],url=this.url){
    	return vcf.getArrayBuffer(range,url)
    }
    async fetchGz(range=[0,1000],url=this.url) {
    	let res = await vcf.fetchGz(range,url)
    	vcf.getIndexes(this,res)
    	//debugger
    	return res
    }
    async fetchRange(range=[0,1000]) {
        // check or retrieve header
        if(!this.meta){
        	await vcf.getMetadata(this)
        }
        let res = await vcf.fetchRange(range,url=this.url)
        return res
    }
    async saveQueryResult(){
        if(this.lastQueryResult!=null && this.lastQueryResult!=undefined){
            if(this.lastQueryResult.hit.length != 0){
                var result = this.cols.join('\t')+'\n'
                this.lastQueryResult.hit.forEach( x => {
                    result += x.join('\t')+'\n'
                })
                return vcf.saveFile(result, 'queryResult.tsv')
            }
        }
        alert('There are no query results to export.')
    }
    
    async handleKey(){
        this.key=await vcf.getArrayBuffer([0,15], this.url)
    	const dv = new DataView(this.key)
        vcf.gzKey = [...Array(dv.byteLength)].map((x,i)=>dv.getUint8(i)) // pick key from first 16 integers
        this.gzKey = vcf.gzKey
    }
    
    async initialization() {
        var url = this.url
        let that = this
        
        /*
        vcf.fileSize(url).then( (value) => {
            this.size = value
            that.handleKey().then( (value) => {
                vcf.getMetadata(that).then( async (value) => {
                    await vcf.getTail(that)    
                })
            })
    	})
    	*/
    	
    	that.size=await vcf.fileSize(url)
    	console.log('Size: '+that.size)
        await that.handleKey()
        console.log('Key '+that.gzKey)
        await vcf.getMetadata(this) 
        console.log('Columns '+that.cols)
        await vcf.getTail(this)
        
        
    }
}

/** 
* Initializes main library object.
*
* @param {string} [url=https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz] The vcf file url.
* @param {number} [keyGap=19999] The gap length between keys.
* @param {string} [chrCode=1-22,X,Y,XY,MT,0] Chromosomes that will be used (Ex.: '2' or '1-22' or '1-22,X,Y,XY,MT' or 'X,Y').
*
* @returns {Object} Vcf library object.
* 
* @example
* let v = await Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* let v = await Vcf(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz', null, '1-22')
* let v = await Vcf(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz', 19999)
* let v = await Vcf(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz', 19999, '1-5')
*/
Vcf = async function (url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz', keyGap=vcf.keyGap, chrCode=vcf.chrCode){
    //alternative url https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz'){
    
    /* Initializes object with the direct attributes*/
    let that = new VcfObject(url, keyGap, chrCode)
    /*
    that.url=url
    that.date=new Date()
    that.keyGap=keyGap||vcf.keyGap
    that.lastQueryResult = null
    
    that.chrCode=chrCode
	if(typeof(chrCode)=="string"){
		if(chrCode.match(/\w+-\w+/)){
			let range = chrCode.match(/\w+-\w+/)[0].split('-').map(x=>parseInt(x))
			let rangeTxt=`${range[0]}`
			for (var i = range[0]+1;i<=range[1];i++){
				rangeTxt+=`,${i}`
			}
			that.chrCode=chrCode.replace(/\w+-\w+/,rangeTxt)
			//debugger
		}
		that.chrCode=that.chrCode.split(',')
	}
    */
    
    
    /* Initialize functions of the library in the object */
    
    /*
    that.indexGz=async(url=that.url)=>{
        that.indexGz=await vcf.indexGz(url,size=await that.size) // note how the indexGz function is replaced by the literal result
        return that.indexGz
    }
    that.query=async function(q='1,10485'){
		return await vcf.query(q, that)
	}
    that.queryInBatch=async function(query){
		return await vcf.queryInBatch(query, that)
	}
    that.getArrayBuffer=async(range=[0,1000],url=that.url)=>{
    	return vcf.getArrayBuffer(range,url)
    }
    that.fetchGz = async(range=[0,1000],url=that.url)=>{
    	let res = await vcf.fetchGz(range,url)
    	vcf.getIndexes(that,res)
    	//debugger
    	return res
    }
    that.fetchRange=async(range=[0,1000])=>{
        // check or retrieve header
        if(!that.meta){
        	await vcf.getMetadata(that)
        }
        let res = await vcf.fetchRange(range,url=that.url)
        return res
    }
    that.saveQueryResult= ()=>{
        if(that.lastQueryResult!=null && that.lastQueryResult!=undefined){
            if(that.lastQueryResult.hit.length != 0){
                var result = that.cols.join('\t')+'\n'
                that.lastQueryResult.hit.forEach( x => {
                    result += x.join('\t')+'\n'
                })
                return vcf.saveFile(result, 'queryResult.tsv')
            }
        }
        alert('There are no query results to export.')
    }
    */
    
    /* Initializes object with the computed attributes*/
    await that.initialization()
    
    return that 
    
    /*
    (async function(){ 
        
    	that.size=await vcf.fileSize(url);
    	
    	that.key=await (await vcf.fetchRange([0,15],that.url)).arrayBuffer()
    	const dv = new DataView(that.key)
        vcf.gzKey = [...Array(dv.byteLength)].map((x,i)=>dv.getUint8(i)) // pick key from first 16 integers
        that.gzKey = vcf.gzKey
        
        await vcf.getMetadata(that) 
        await vcf.getTail(that)
    })(); 
    */
}

/** 
* Obtain a slice according to a byte range from the file.
* 
*
* @param {array} range An array with the start and end positions (Ex.: [0,1000]).
* @param {string} url The vcf file url.
*
* @returns {Object} Request object of partial content (http code 206).
* 
* @example
* var content = await vcf.fetchRange([0,2000], 'https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
*/
vcf.fetchRange=(range,url)=>{
	range[0]=Math.max(range[0],0) // to stay in range
    
    return fetch(url,{
        headers: {
            'content-type': 'multipart/byteranges',
            'range': `bytes=${range.join('-')}`,
        }
    })
}

/** 
* Extracts metadata from compressed file.
* 
*
* @param {Object} that Vcf library object.
*
* @returns {array} Lines of metadata of the vcf file.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var meta = await vcf.getMetadata(v)
*/
vcf.getMetadata= async that=>{ // extract metadata
	let ini = await vcf.fetchGz([0,500000],that.url) // this should probably have the range automated to detect end of header
	let arr = ini.txt.split(/\n/g)
    that.meta=arr.filter(r=>r.match(/^##/))
    that.cols=arr[that.meta.length].slice(1).split(/\t/) // column names
    //console.log(`Columns: ${that.cols}`)
    let vals = arr[that.meta.length+1].split(/\t/g)
    vcf.getIndexes(that,ini)
    return that.meta
}

/** 
* Find the last rows of the compressed file, requires getMetadata to find tail indexes to extablish span.
* 
*
* @param {Object} that Vcf library object.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var tail = await vcf.getTail(v)
*
*/
vcf.getTail=async that=>{ // to be run after vcf.getMetadata, to find tail indexes to extablish span
	if(!that.meta||!that.idxx){
		await vcf.getMetadata(that)
	}
	let ini = await vcf.fetchGz(that.size-that.keyGap)
	vcf.getIndexes(that,ini)
	//debugger
}

/** 
* Index decompressed content.
* 
*
* @param {Object} that Vcf library object.
* @param {Object} ini An object output of vcf.fetchGz, containing the following attributes: txt - text of the range just read, arrBuff - bytes read as array buffer, idx - indexes of this range, range - array with the start and end byte indexes, url - vcf file url.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* let ini = await vcf.fetchGz([0,500000], v.url)
* var indexes = await vcf.getIndexes(v, ini)
*
*/
vcf.getIndexes=(that,ini)=>{ 
    let dt = ini.txt.split(/\n/g).filter(x=>!x.match(/^#/)).map(r=>r.split(/\t/g))
    
    if(dt.length<2){
    	console.log('Error: No data was read')
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
		
		if(!that.ii00.includes(ini.idx[0])){ // if this is new
			that.ii00.push(ini.idx[0]) // update index of start indexes
			that.idxx.push({
				ii:ini.idx,
				chrStart:firstRow[0],
				chrEnd:lastRow[0],
				posStart:parseInt(firstRow[1]),
				posEnd:parseInt(lastRow[1]),
				dt:dt
			}),
			that.idxx=vcf.sortIdxx(that.idxx)
			that.ii00=that.ii00.sort((a,b)=>a>b?1:-1)
		}
    }
}

/** 
* Default query based on specific position of a chromosome
* 
*
* @param {string} [q=1,10485] Search parameter in the format 'chromosome,position'.
* @param {Object} that Vcf library object.
*
* @returns {Object} Search result object, containing the following attributes: hit - array containing the vcf table lines with the SNPs found in the chromosome and position searched, range - the object with the specific chunk content in which the search obtained hits (same attributes as one of the idxx attribute items found in the Vcf main library object).
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var result = await vcf.query('7,151040280', v)
*/
vcf.query= async function(q='1,10485',that){
	if(typeof(q)=='string'){ // chr,pos
		q=q.split(',') // chr kept as string
		q[1]=parseFloat(q[1]) // pos converted into number
		q[0]=that.chrCode.indexOf(q[0]) // chr converted into index if chrCode array
	}
	
	// start iterative querying
	//console.log(`range search for (${q})`)
	// 1 -  find bounds
	let val={hit: [], range: undefined} // matching results will be pushed here
	let j=0  // counter
	// Make sure to start i at the range that precedes the query
	
	let i=0
	for(i=0;i<that.idxx.length;i++){
		let chrEnd = that.chrCode.indexOf(that.idxx[i].chrEnd)
		let posEnd=that.idxx[i].posEnd
		if(chrEnd>q[0]){ // chr range i ends beyond query
			break
		} else if(chrEnd==q[0]&posEnd>=q[1]){
			break
		}
	}
	console.log(`Seed ${i}: start - ${that.idxx[i].chrStart}; end - ${that.idxx[i].chrEnd}`)
	
	previousRange='0:0-0:0'
	
	var searchedRanges = []
	//console.log(`Query seed: ${i}`)
	while(i<that.idxx.length){
		//val=[] // reset every try
		j=j+1
		if(j>50){
			console.log(`${j} max iterations limit reached`)
			break
		}
		let chrStart = that.chrCode.indexOf(that.idxx[i].chrStart) // the index of the chromossome, not the chromossome name
		let posStart = that.idxx[i].posStart
		let chrEnd = that.chrCode.indexOf(that.idxx[i].chrEnd)
		//let posEnd = that.idxx[i].posEnd
		let posEnd = parseInt(that.idxx[i].dt.filter(r=>r[0]==that.chrCode[chrStart]).slice(-2,-1)[0][1]) // last position for this chromossome
		//console.log(`(${i}) ${that.chrCode[chrStart]}:${posStart}-${that.chrCode[chrEnd]}:${posEnd}`)
		
		newRange=`${that.chrCode[chrStart]}:${posStart}-${that.chrCode[chrEnd]}:${posEnd}`
		console.log(newRange == previousRange)
		if(newRange != previousRange){
		    previousRange = newRange
		    if (chrStart<q[0]){ // undershot chr target
				    //i = i>0? i-1 : 0
				    await that.fetchGz(Math.round((that.ii00[i]+that.ii00[i+1])/2))
				    //debugger
		    }else{
			    if(chrStart>q[0]){ // overshot
				    i = i>0? i-1 : 0
				    await that.fetchGz(Math.round((that.ii00[i]+that.ii00[i+1])/2))
			    }else{ // on chr target
				    //console.log(`(${j}) chr match ${v.chrCode[chrStart]}`)
				    //break
				    //use only positions for this chr
				    
				    if((posStart<q[1])&(posEnd>q[1])){ // range found
					    val.range=that.idxx[i]
					    val.hit=that.idxx[i].dt.filter(r=>r[0]==that.chrCode[q[0]]&r[1]==q[1])
					    break
				    }else if(posStart<q[1]){ // almost there
					    //i = i>0? i-1 : 0
					    await that.fetchGz(Math.round((that.ii00[i]+that.ii00[i+1])/2))
				    }
				    else{ // overshot, take a step back
					    i = i>0? i-1 : 0
					    await that.fetchGz(Math.round((that.ii00[i]+that.ii00[i+1])/2))
					    
				    }
			    }
		    }
		}
		else{
		    val.range=that.idxx[i]
		    val.range.dt = val.range.dt.filter( x => x.length==that.cols.length )
			val.hit=that.idxx[i].dt.filter(r=>r[0]==that.chrCode[q[0]]&r[1]==q[1])
			break
		}
		i++
	}
	that.lastQueryResult = val
	return val
}

/** 
* Query based on a list of positions of chromosomes
* 
*
* @param {array} [query=[["8","73458588"],["MT","11252"],["4","53814975"]] Search parameter in the format of a list of sublists containing chromosome in position 0 and position in position 1.
* @param {Object} that Vcf library object.
*
* @returns {Object} Search result object, containing the following attribute: hit - array containing the vcf table lines with the SNPs found in the chromosome an dposition searched.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var dat = await fetch(location.href.split('#')[0]+'multiple_query.json')
* dat = await dat.json()
* var result = await vcf.queryInBatch(dat['list'], v)
*/
vcf.queryInBatch = async (query, that) => {
    var compiled={ 'hit': [], 'range': { 'dt': [] } }
    var filtered = query.filter( p =>{ p.length==2 } )
    filtered = query.filter( p => that.chrCode.includes(String(p[0]))&!isNaN(parseInt(p[1])) )
    console.log('first filter: '+filtered.length)
    if(filtered.length > 0){
        var orderedQuery = []
        that.chrCode.forEach( k => { 
            orderedQuery = orderedQuery.concat( filtered.filter( p => String(p[0]) == String(k) ) ) 
        })
        console.log('2nd filter: '+orderedQuery.length)
        
        // Removing query repetitions and formatting
        var gone = []
        orderedQuery.forEach( async q => {
            q=`${q[0]},${q[1]}`
            if( ! gone.includes(q) ){
                gone.push(q)
                
                /*var result = await that.query(q)
                var checked = result.hit.filter( x => x.length==that.cols.length )
                
                */
                
                /*that.query(q).then( (result) => {
                    compiled.hit = compiled.hit.concat(result.hit)
                })*/
            }   
        })
        console.log('3rd filter: '+gone.length)
        
        var total = gone.length
        var counter=0
        
        if(document.getElementById('progress')!=null){
            document.querySelector('.progress').style.display='block'
            document.getElementById('progress').setAttribute('aria-valuenow', counter)
            document.getElementById('progress').setAttribute('aria-valuemax', total)
        }
        
        var checklist = await Promise.all( gone.map( async (q) => {
            var result = await that.query(q)
            var checked = result.hit.filter( x => x.length==that.cols.length )
            compiled.hit = compiled.hit.concat( checked )
            if(result.range!=undefined){
                compiled.range.dt = compiled.range.dt.concat( result.range.dt.filter( x => x.length==that.cols.length ) )
            }
            counter+=1
            
            if(document.getElementById('progress')!=null){
                document.getElementById('progress').setAttribute('aria-valuenow', counter)
                var perc=((counter*100)/total).toFixed(2)
                document.getElementById('progress').innerHTML=perc+'% finished'
                document.getElementById('progress').style.width=perc+'%'
            }
            
            return q
        }))
        
        if(document.getElementById('progress')!=null){
            document.querySelector('.progress').style.display='none'
        }
            
        that.lastQueryResult = compiled
    }
    else{
        alert('There are no valid entries to query')
    }
    return compiled
}

/** 
* Sort the indexes retrieved
* 
*
* @param {Object} idxx An object corresponding to the idxx attribute found in the Vcf main library object.
*
* @returns {Object} Same object received as input but sorted.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var sortedIndexes = await vcf.sortIdxx(v.idxx)
*/
vcf.sortIdxx=(idxx)=>{
	return idxx.sort((a,b)=>(a.ii[0]-b.ii[0]))
}

/** 
* Get partial content as array buffer
* 
*
* @param {array} [range=[0,1000]] An array containing the start and end positions of the byte range to be read.
* @param {string} [url=test_4X_191.vcf] Vcf file url.
*
* @returns {array} Arraybuffer containing the portion of bytes read from the file.
* 
* @example
* var arr_buffer = await vcf.getArrayBuffer([0,2000], 'test_4X_191.vcf')
*/
vcf.getArrayBuffer=async(range=[0,1000],url='test_4X_191.vcf')=>{
    return await (await (fetch(url,{
        headers: {
			'content-type': 'multipart/byteranges',
			'range': `bytes=${range.join('-')}`,
		}
    }))).arrayBuffer()
}

/** 
* Uncompress and retrieve content from a file portion
* 
*
* @param {array|number} [range=0] An array containing the start and end positions of the byte range to be read, or a single number indicating the start.
* @param {string} [url=https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz] Vcf file url.
* @param {number} [keyGap=19999] The gap length between keys.
*
* @returns {Object} An object containing the following attributes: txt - text of the range just read, arrBuff - bytes read as array buffer, idx - indexes of this range, range - array with the start and end byte indexes, url - vcf file url.
* 
* @example
* var content = await vcf.fetchGz([0,2000], 'https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz', 19999)
* var content = await vcf.fetchGz(0, 'https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz', 19999)
*/
vcf.fetchGz=async(range=0,url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz',keyGap=vcf.keyGap)=>{
   if(typeof(range)=="number"){
    	range = [range,range+keyGap]
    }
    if((range[1]-range[0])<keyGap){
    	range = [range[0],range[0]+keyGap]
    }
    
    const ab = await (await vcf.fetchRange(range,url)).arrayBuffer()
    const dv = new DataView(ab)
    const it = [...Array(dv.byteLength)].map((x,i)=>dv.getUint8(i)) // as integers
    const id = vcf.matchKey(it.slice(0, keyGap))
    
    let res = {
    	txt:pako.inflate(ab.slice(id[0]),{"to":"string"}),
    	arrBuff:ab,
    	idx:id.map(v=>v+range[0]),
    	range:range,
    	url:url
    }

    return res
}

/** 
* Build index for the entire file
* 
*
* @param {string} [url=https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar_20201026.vcf.gz] Vcf file url.
* @param {number} size Vcf file size
*
* @returns {Object} An object containing the following attributes: chunks - array containing the chunk indexes, chrPos - Chromosome Positions found in the chunks.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var index = await vcf.indexGz(v.url, v.size)
*/
vcf.indexGz=async(url='https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar_20201026.vcf.gz', size)=>{
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

/** 
* Check whether the chunk key matches with a key from the compressed file
* 
*
* @param {array} arr Byte array indexes of the current chunk.
* @param {array} [key=[31,139,8,4,0,0,0,0,0,255,6,0,66,67,2,0]] A list of sixteen numbers representing the compression indexes.
*
* @returns {array} A list of the indexes from the current chunk that matched with the compression indexes.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var matched = await vcf.indexGz( [21, 39, 39, 13, 9, 24, 4, 6, 27, 18, 2, 25, 35, 8, 26, 14, 18, 31, 23, 18], v.gzKey)
*/
vcf.matchKey=(arr, key=vcf.gzKey)=>{
    let ind=arr.map((x,i)=>i) // the indexes
    key.forEach((k,j)=>{
        ind=ind.filter(i=>arr[i+j]==k)
    })
    return ind
}

/** 
* Compress the index retrieved for the entire file
* 
*
* @param {Object} idx An object containing the following attributes: chunks - array containing the chunk indexes, chrPos - Chromosome Positions found in the chunks.
* @param {string} filename Filename for exportation.
*
* @returns {Object} Compressed binary file.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var index = await vcf.indexGz(v.url, v.size)
* await vcf.compressIdx(index, 'indexFile.gz')
* var content = await vcf.compressIdx(index)
*/
vcf.compressIdx=function(idx,filename){
    // string it
    //let xx = pako.deflate(idx.chunks.concat(idx.chrPos.map(x=>x[0]).concat(idx.chrPos.map(x=>x[1]))))
    let xx = pako.gzip(idx.chunks.concat(idx.chrPos.map(x=>x[0]).concat(idx.chrPos.map(x=>x[1]))))
    if(filename){
        vcf.saveFile(xx,filename)
    }
    return xx
}

/** 
* Obtain file size
* 
*
* @param {string} [url=https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz] Vcf file url.
*
* @returns {number} Total file size.
* 
* @example
* let size = await vcf.fileSize('https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh37/clinvar.vcf.gz')
*/
vcf.fileSize=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    let response = await fetch(url,{
        method:'HEAD'
    });
    const reader = response.body.getReader();
    const contentLength = response.headers.get('Content-Length');
    return parseInt(contentLength)
}

/** 
* Save query result
* 
*
* @param {number} that Vcf library object
*
* @returns {HTMLAnchorElement} HTML anchor (<a />) element with the click event fired.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* v.query('7,151040280')
* var tag = await vcf.saveQueryResult(v)
* tag = v.saveQueryResult()
*/
vcf.saveQueryResult= (that)=>{
    if(that.lastQueryResult!=null && that.lastQueryResult!=undefined){
        if(that.lastQueryResult.hit.length != 0){
            var result = that.cols.join('\t')+'\n'
            that.lastQueryResult.hit.forEach( x => {
                result += x.join('\t')+'\n'
            })
            return vcf.saveFile(result, 'queryResult.tsv')
        }
    }
    alert('There are no query results to export.')
}

/** 
* Open the file in download mode
* 
*
* @param {Object} x Compressed binary file.
* @param {string} filename Filename for exportation.
*
* @returns {HTMLAnchorElement} HTML anchor (<a />) element with the click event fired.
* 
* @example
* let v = await new Vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz')
* var index = await vcf.indexGz(v.url, v.size)
* var content = await vcf.compressIdx(index)
* var tagA = await vcf.saveFile(content, 'indexFile.gz')
*/
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

/** 
* Load a certain dependency library from link
* 
*
* @param {string} url Library URL.
* 
* @example
* vcf.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.11/pako.min.js')
*
*/
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
// v = new vcf('https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh37/clinvar.vcf.gz')
// v = new vcf('https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')
// await v.query('7,151040280')
// await v.query('10,133421085')
// rs35850753 = await v.query('17,7675353')
// (await v.fetchGz(59001026)).txt.split(/\n/).slice(1).map(x=>x.split(/\t/))[0]
// (await v.fetchGz(20000000)).txt.split(/\n/).slice(1).map(x=>x.split(/\t/))[0]

//if(typeof(define)!='undefined'){
//	define(vcf)
//}
