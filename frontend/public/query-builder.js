
function findForm() {
    console.log(1);
    return document.querySelector(".boostrap form");
}

function FormToQuery(form) {
    return null;
}

/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let query = {};
    form = findForm();
    // TODO: implement!
    // console.log("CampusExplorer.buildQuery not implemented yet.");
    return query;
};
