// from COMP2521 w8 lab code with some modification
// Adjacency Matrix Representation - directed 

// written by Bianca Ren
// Date: 7th Nov 2022

#ifndef GRAPH_H
#define GRAPH_H

#include <stdbool.h>

typedef struct graph *Graph;

typedef int urlNum;

/**
 * Creates a new instance of a graph
 */
Graph GraphNew(int row, int col);

/**
 * Frees all memory associated with the given graph
 */
void GraphFree(Graph g);

/**
 * Returns the number of vertices in the graph
 */
int GraphNumVertices(Graph g);

/**
 * Inserts  an  edge into a graph. Does nothing if there is already an
 * edge between `e.v` and `e.w`. Returns true if successful, and false
 * if there was already an edge.
  */
bool GraphInsertEdge(Graph g, urlNum src, urlNum dest);

/**
 * Removes an edge from a graph. Returns true if successful, and false
 * if the edge did not exist.
 */
bool GraphRemoveEdge(Graph g, urlNum v, urlNum w);

/**
 * Returns 1 if it exists, or 0 otherwise
 */
int GraphIsAdjacent(Graph g, urlNum v, urlNum w);

/*
 * Show the graph (directed) in the form of adjacency matrix
 * if url v is not toward to url w, then it won't show any number in that grid
 */
void GraphShow(Graph g);

/*
 * Return the value in the specific grid
 */
int edgeValue(Graph directUrl, int x, int y);

/*
 * It counts the number of outlinks from the given url
 */
int numOfOutLinks(Graph directUrl, int currUrl);

/*
 * Calculate number of matches that url page contains the given terms
 */
int numMatchingTerms(Graph invertedIndex, int url);

#endif
