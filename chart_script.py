import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Load the data
df = pd.read_csv("visualization_components.csv")

# Print the data to understand its structure
print("Data structure:")
print(df.head())
print("\nColumns:", df.columns.tolist())
print("\nPerformance Impact values:", df['Performance_Impact'].unique())

# Create numerical scores for Performance Impact levels
impact_scores = {'High': 3, 'Medium': 2, 'Low': 1}
df['Impact_Score'] = df['Performance_Impact'].map(impact_scores)

# Define color mapping for Performance Impact levels
color_map = {
    'High': '#DB4545',     # Soft red for high impact
    'Medium': '#FFC185',   # Light orange for medium impact  
    'Low': '#ECEBD5'       # Light green for low impact
}

# Create horizontal bar chart
fig = px.bar(df, 
             y='Component', 
             x='Impact_Score',
             color='Performance_Impact',
             color_discrete_map=color_map,
             orientation='h',
             title="Performance Impact of Components")

# Update layout for horizontal bars and legend
fig.update_layout(
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    xaxis_title="Impact Level",
    yaxis_title="Component"
)

# Update x-axis to show meaningful labels
fig.update_xaxes(
    tickvals=[1, 2, 3],
    ticktext=['Low', 'Medium', 'High']
)

# Save the chart
fig.write_image("performance_impact_chart.png")
print("Chart saved successfully!")