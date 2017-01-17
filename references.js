var fs = require('fs');
var parse = require('csv-parse');
var csv = fs.readFileSync(`./scopus_2.csv`, 'UTF-8');

var results = {};

var out = 'ref,count\r\n';
	
parse(csv, {delimiter:";"}, function(err, rows){
	
	// if(err)
		// console.log('>>',err);
	
 rows.forEach((row,index)=>{
	 
	 var row = row[23];
	 
	 var refs = row.split(';');
	 
	 refs.forEach(ref=>{
		 
		 if(!results[ref])
			results[ref] = 1;
		 else
			results[ref]++;		
			
	 });
	 
 });
 
 for(var i in results)
	 out += '"'+i+'";'+results[i]+'\r\n';

	fs.writeFileSync(`./references.csv`, out);
    
  
});
