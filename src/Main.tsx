import * as React from "react";

import { createGraph } from "./graph"


export class Main extends React.Component<undefined, undefined> {


    render() {

        createGraph();

        return <i>Scopus Browser</i>;
    }
}