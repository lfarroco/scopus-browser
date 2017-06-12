import * as d3 from "d3"
import * as stopwords from "stopword"
declare var jLouvain: any;
import * as Tokenizer from "natural/lib/natural/tokenizers/treebank_word_tokenizer";
import * as pluralize from "pluralize";

const tokenizer = new Tokenizer();

interface Node { id: String; group: Number; } //id is the word itself (it's "name")
interface Link { source: String; target: Number; value: Number } //source and target are the words' names

let isBusy = false;



export function createGraph(): void {

    //console.log(stopwords.removeStopwords(["the", "bird", "is", "in", "its", "nest"]));

    let nodesDict = {};
    let edgesDict = {}; // { "word1":{"word2":10, word3:11, ...}, "word5":{ ... } }
    let id = 1;

    d3.csv("scopus.csv", function (error, rows: any[]) {

        let rowIndex = 0;

        let done = document.getElementById("done")
        let total = document.getElementById("total")

        total.innerHTML = rows.length + "";

        let interval = setInterval(() => {

            if (rowIndex == rows.length) {
                clearInterval(interval);
                finish(edgesDict);
                return;
            }

            if (isBusy) return;

            done.innerHTML = rowIndex + "";


            isBusy = true;

            parseRow(rows, rowIndex, nodesDict, edgesDict)

            rowIndex++;

            isBusy = false;

        }, 10);

    });



    ////////////



}

function parseRow(rows, rowIndex, dict, edges) {

    let row = rows[rowIndex];

    let wordIndex = 0;

    let tokens = tokenizer.tokenize(row.Abstract);

    tokens = stopwords.removeStopwords(tokens);

    let textDict = {};

    tokens.forEach(t => {

        if (!isNaN(t) || t.length < 4) return;

        let word = t.toLowerCase();
        word = pluralize.singular(word);

        if (!textDict[word])
            textDict[word] = 0;

        textDict[word]++;

    });

    let frequent = []

    for (var word in textDict) {
        if (textDict[word] > 1) {
            frequent.push(word)
            dict[word] = true;
        }
    }

    frequent.forEach((sourceWord) => {

        frequent.forEach((targetWord) => {

            if (sourceWord == targetWord) return;

            if (edges[targetWord] && edges[targetWord][sourceWord]) {
                edges[targetWord][sourceWord] = edges[targetWord][sourceWord] + 1;
                return
            }
            if (edges[sourceWord] && edges[sourceWord][targetWord]) {
                edges[sourceWord][targetWord] = edges[sourceWord][targetWord] + 1;
                return
            }

            if (!edges[sourceWord]) {
                edges[sourceWord] = {};
            }
            if (!edges[sourceWord][targetWord]) {
                edges[sourceWord][targetWord] = 0;
            }

            edges[sourceWord][targetWord]++;

        });

    });

    console.log(rowIndex);

}

function addToDict(word: any, dict: any) {

    //add to dict

    if (!dict[word]) {
        dict[word] = { id: word, count: 1 };
    }
    else {
        dict[word].count++;
    }



    return dict;

}

function finish(links) {

    console.log(links)

    var nodes = [];
    var edges = [];

    var dict = {}


    for (var sourceWord in links) {
        for (var targetWord in links[sourceWord]) {
            let weight = links[sourceWord][targetWord];
            if (weight > 15) {
                edges.push({
                    source: sourceWord,
                    target: targetWord,
                    value: weight
                })

                if (!dict[sourceWord]) dict[sourceWord] = 0;
                if (!dict[targetWord]) dict[targetWord] = 0;

                dict[sourceWord] += weight;
                dict[targetWord] += weight;
            }
        }

    }

    let smaller = 10;
    let bigger = 0;

    for (var word in dict) {

        let weight = dict[word];
        //if(weight < 20)

        if (weight < smaller) smaller = weight;
        if (weight > bigger) bigger = weight;

        nodes.push({ id: word, group: 1, weight: weight })
    }

    var node_data = nodes.map(function (d) { return d.id });

    var community = jLouvain().nodes(node_data).edges(edges);
    var result = community();
    console.log(result);
    nodes.forEach(function (node) {
        node.group = result[node.id]
    });

    // edges = edges.sort((a, b) => b.value - a.value)
    // edges = edges.slice(0, 40);

    createD3Chart(nodes, edges, smaller, bigger)

}

function createD3Chart(nodes, links, smaller, bigger) {
    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var scale = d3.scaleLinear()
        .domain([smaller, bigger])
        .range([5, 50]);

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().distance(200).id(function (d: any) { return d.id; }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    d3.json("data/miserables.json", function (error, graph: any) {
        if (error) throw error;

        var link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke-width", function (d: any) { return Math.sqrt(d.value); });

        var elem = svg.selectAll("g myCircleText")
            .data(nodes)

        var elemEnter = elem.enter()
            .append("g");

        var node = elemEnter.append("circle")
            .attr("r", function (d: any) { return scale(d.weight) })
            .attr("fill", function (d: any) { return color(d.group); })


        var text = elemEnter.append("text")
            .attr("dx", function (d) { return -5 })
            .text(function (d: any) { return `${d.id} (${d.weight})` })
            .attr("font-family", "sans-serif")
            .attr("font-size", "8px")
            .attr("fill", "#000")
            .attr("text-anchor", "middle")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))

        simulation
            .nodes(nodes)
            .on("tick", ticked);

        let force: any = simulation.force("link");

        force["links"](links);

        function ticked() {
            link
                .attr("x1", function (d: any) { return d.source.x; })
                .attr("y1", function (d: any) { return d.source.y; })
                .attr("x2", function (d: any) { return d.target.x; })
                .attr("y2", function (d: any) { return d.target.y; });

            node
                .attr("cx", function (d: any) { return d.x; })
                .attr("cy", function (d: any) { return d.y; });

            text
                .attr("x", function (d: any) { return d.x; })
                .attr("y", function (d: any) { return d.y; });


        }
    });

    function dragstarted(d: any) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d: any) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d: any) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    //// zoom
    var zoom = d3.zoom()
        .scaleExtent([1, 40])
        .translateExtent([[-100, -100], [width + 90, height + 100]])
        .on("zoom", zoomed);

    function redraw() {
        return svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    svg.call(zoom);

    function zoomed() {
        svg.attr("transform", d3.event.transform);
    }
}