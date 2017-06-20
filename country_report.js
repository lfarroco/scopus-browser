var fs = require('fs');
var sw = require('stopword');
var parse = require('csv-parse');
var csv = fs.readFileSync(`./scopus_2.csv`, 'UTF-8');
var natural = require('natural');
var tokenizer = new natural.WordTokenizer();
var pluralize = require('pluralize');

var nodes = 'id,label\r\n';
var edges = 'source,target,type\r\n';

var id = 1;
var dic = {};
var wordsIndex = {};

parse(csv, { delimiter: ";" }, function (err, output) {

	// if(err)
	// console.log('>>',err);

	// console.log(output);

	createNodes(output);

	createEdges(output);

});

function createNodes(rows) {

	rows.forEach((row, textIndex) => {

		console.log(textIndex);

		var abstract = row[4];

		var tokens = tokenizer.tokenize(abstract);

		tokens.forEach((item, index) => {

			tokens[index] = item.toLowerCase();

		});

		text = sw.removeStopwords(tokens);

		wordsIndex[textIndex] = {};

		// console.log('text:::::',text[0]);

		text.forEach(w => {

			// console.log('w::',w);

			var word = pluralize.singular(w);

			if (!dic[word]) {
				dic[word] = { id: id, count: 1 };
				wordsIndex[textIndex][id] = 1;
				id++;
			}
			else {

				// console.log('..adding word to existing textIndex');

				dic[word].count++;
				if (!wordsIndex[textIndex][dic[word].id]) {
					// console.log('....creating new textIndex');
					wordsIndex[textIndex][dic[word].id] = 1;
				}
				else {
					// console.log('....adding to textIndex');
					wordsIndex[textIndex][dic[word].id]++;
				}
			}


		});

	});

	for (var i in dic) {

		var curr = dic[i];

		// if(curr.count > 10)
		nodes += curr.id + ',' + i + ',' + curr.count + '\r\n';
		//=DIREITA(F11;NÚM.CARACT(F11)-PROCURAR("|";SUBSTITUIR(F11;",";"|";NÚM.CARACT(F11)-NÚM.CARACT(SUBSTITUIR(F11;",";"")))))
	}

	fs.writeFileSync(`./nodes.csv`, nodes);


}

function createEdges(rows) {

	console.log('edges...');

	rows.forEach((row, index) => {

		console.log(index);

		var words = wordsIndex[index];

		var list = [];

		for (var i in words) {

			if (words[i] > 5)
				list.push({ id: i, count: words[i] });

		}

		list = list.sort(function (a, b) {

			return b.count - a.count;

		});

		for (var k = 0; k < list.length; k++)
			for (var j = k + 1; j < list.length; j++) {
				edges += list[k].id + ',' + list[j].id + ',undirected\r\n';
			}
	});

	fs.writeFileSync(`./edges.csv`, edges);

}