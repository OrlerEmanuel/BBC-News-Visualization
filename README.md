# BBC News Atlas

An interactive browser version of the visualization defined in
`Scripts/Visualization/Visualization.ipynb`.

The main UMAP displays documents grouped by topic. Clicking a document updates
the selected topic's word cloud and monthly publication histogram.

## Structure

- `index.html`: experience content and structure.
- `styles.css`: dashboard layout.
- `app.js`: UMAP, word cloud, histogram, and topic selection.
- `Datasets/bbc_news_preprocessed_UMAP.csv`: visualized data source.
