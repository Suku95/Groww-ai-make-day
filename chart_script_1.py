import pandas as pd
import plotly.express as px

# Load the data
df = pd.read_csv("customization_features.csv")

# Check the data first
print("Original data shape:", df.shape)
print("\nColumns:", df.columns.tolist())
print("\nFirst few rows:")
print(df.head())
print("\nControl_Type values:")
print(df['Control_Type'].value_counts())
print("\nDefault_Value types and examples:")
print(df['Default_Value'].dtype)
print(df['Default_Value'].unique()[:10])

# Filter for numeric default values more carefully
# Try to convert to numeric, but check what we're losing
df['Default_Value_Numeric'] = pd.to_numeric(df['Default_Value'], errors='coerce')
df_numeric = df[df['Default_Value_Numeric'].notna()].copy()

print(f"\nAfter numeric filtering: {len(df_numeric)} rows from {len(df)} original rows")
print("Control_Type distribution in filtered data:")
print(df_numeric['Control_Type'].value_counts())

# Create scatter plot with proper colors for each Control_Type
fig = px.scatter(df_numeric, 
                x='Feature', 
                y='Default_Value_Numeric',
                color='Control_Type',
                title="Customization Features Default Values",
                color_discrete_sequence=['#1FB8CD', '#FFC185', '#ECEBD5', '#5D878F', '#D2BA4C', '#B4413C'])

# Update layout for rotated x-axis labels
fig.update_xaxes(title="Feature Name", tickangle=45)
fig.update_yaxes(title="Default Val")

# Apply cliponaxis to all traces
fig.update_traces(cliponaxis=False)

# Save the chart
fig.write_image("customization_features_scatter.png")