import pandas as pd
import json

# Create a comprehensive dataset of the technical components and features
visualization_data = {
    'Component': [
        'Core Renderer', 'Scene Management', 'Camera System', 'Interaction System',
        'Animation Engine', 'GUI Controls', 'Node System', 'Line Rendering',
        'Tooltip System', 'Event Handlers', 'Material System', 'Lighting Setup'
    ],
    'Technology': [
        'Three.js WebGLRenderer', 'Three.js Scene', 'PerspectiveCamera + OrbitControls', 'Raycaster + Mouse Events',
        'RequestAnimationFrame', 'lil-gui', 'Sphere Geometry Nodes', 'Line Geometry',
        'CSS2DRenderer', 'addEventListener', 'MeshBasicMaterial', 'AmbientLight + DirectionalLight'
    ],
    'Purpose': [
        'Hardware-accelerated 3D rendering', 'Organize 3D objects hierarchy', 'Navigate and view the visualization', 'Detect mouse hover on 3D objects',
        'Smooth 60fps animation loop', 'Real-time parameter adjustment', 'Interactive endpoint markers', 'Connect center to nodes',
        'Display hover information', 'Handle user interactions', 'Define visual appearance', 'Illuminate the 3D scene'
    ],
    'Customizable': [
        'Yes', 'No', 'Yes', 'Yes',
        'Yes', 'Yes', 'Yes', 'Yes',
        'Yes', 'No', 'Yes', 'Yes'
    ],
    'Performance_Impact': [
        'High', 'Low', 'Low', 'Medium',
        'Medium', 'Low', 'High', 'Medium',
        'Low', 'Low', 'Medium', 'Low'
    ]
}

# Create features dataset
features_data = {
    'Feature': [
        'Node Count', 'Sphere Radius', 'Line Thickness', 'Node Size',
        'Animation Speed', 'Core Visibility', 'Line Visibility', 'Node Visibility',
        'Core Color', 'Line Color', 'Node Color', 'Background Color',
        'Rotation Toggle', 'Camera Controls', 'Hover Tooltips', 'Reset Defaults'
    ],
    'Control_Type': [
        'Slider', 'Slider', 'Slider', 'Slider',
        'Slider', 'Checkbox', 'Checkbox', 'Checkbox',
        'Color Picker', 'Color Picker', 'Color Picker', 'Color Picker',
        'Checkbox', 'Built-in', 'Automatic', 'Button'
    ],
    'Default_Value': [
        50, 15, 0.02, 0.3,
        0.5, True, True, True,
        '#ffffff', '#4a9eff', '#ff6b47', '#0a0a0a',
        True, 'Enabled', 'Enabled', 'N/A'
    ],
    'Range_Min': [
        10, 5, 0.01, 0.1,
        0, 'N/A', 'N/A', 'N/A',
        'N/A', 'N/A', 'N/A', 'N/A',
        'N/A', 'N/A', 'N/A', 'N/A'
    ],
    'Range_Max': [
        200, 50, 0.1, 2,
        3, 'N/A', 'N/A', 'N/A',
        'N/A', 'N/A', 'N/A', 'N/A',
        'N/A', 'N/A', 'N/A', 'N/A'
    ]
}

# Create performance metrics dataset
performance_data = {
    'Metric': [
        'Rendering FPS', 'Node Count Impact', 'Line Complexity', 'Animation Overhead',
        'Interaction Latency', 'Memory Usage', 'GPU Utilization', 'CPU Usage'
    ],
    'Optimal_Range': [
        '60 FPS', '50-100 nodes', 'Low complexity', 'Minimal',
        '<16ms', 'Moderate', 'Efficient', 'Low'
    ],
    'Performance_Factor': [
        'High', 'Medium', 'Low', 'Low',
        'Medium', 'Medium', 'High', 'Low'
    ],
    'Optimization_Notes': [
        'WebGL hardware acceleration', 'Instanced geometry for nodes', 'Simple line materials', 'Smooth interpolation',
        'Raycasting optimization', 'Geometry reuse', 'Shader efficiency', 'Event handling optimization'
    ]
}

# Save datasets as CSV files
vis_df = pd.DataFrame(visualization_data)
features_df = pd.DataFrame(features_data)
performance_df = pd.DataFrame(performance_data)

vis_df.to_csv('visualization_components.csv', index=False)
features_df.to_csv('customization_features.csv', index=False)
performance_df.to_csv('performance_metrics.csv', index=False)

print("Technical Components:")
print(vis_df.head())
print("\nCustomization Features:")
print(features_df.head())
print("\nPerformance Metrics:")
print(performance_df.head())