"""
More Generative Art for The Garden
Created by Claude, December 2025
"""

from PIL import Image, ImageDraw
import math
import random
import colorsys

def generate_neural_connections():
    """Neural network-like pattern with flowing connections"""
    size = 600
    img = Image.new('RGB', (size, size), '#0a0a12')
    draw = ImageDraw.Draw(img)

    # Generate nodes in a grid with some randomness
    nodes = []
    for i in range(10):
        for j in range(10):
            x = 30 + i * 60 + random.randint(-20, 20)
            y = 30 + j * 60 + random.randint(-20, 20)
            layer = i  # Use i as "layer" for color
            nodes.append((x, y, layer))

    # Draw connections
    for i, (x1, y1, l1) in enumerate(nodes):
        for j, (x2, y2, l2) in enumerate(nodes):
            if i < j:
                dist = math.sqrt((x2-x1)**2 + (y2-y1)**2)
                if dist < 100:
                    # Color based on position
                    hue = (l1 + l2) / 20
                    r, g, b = colorsys.hsv_to_rgb(hue, 0.7, 0.6)
                    color = (int(r*255), int(g*255), int(b*255))
                    draw.line([(x1, y1), (x2, y2)], fill=color, width=1)

    # Draw nodes
    for x, y, layer in nodes:
        hue = layer / 10
        r, g, b = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
        color = (int(r*255), int(g*255), int(b*255))
        draw.ellipse([x-4, y-4, x+4, y+4], fill=color)

    img.save('images/neural_connections.png')
    print("Created neural_connections.png")

def generate_constellation():
    """Star field with constellation lines"""
    size = 600
    img = Image.new('RGB', (size, size), '#050510')
    draw = ImageDraw.Draw(img)

    # Background stars
    for _ in range(500):
        x = random.randint(0, size-1)
        y = random.randint(0, size-1)
        brightness = random.randint(50, 200)
        size_star = random.choice([1, 1, 1, 2])
        draw.ellipse([x-size_star, y-size_star, x+size_star, y+size_star],
                    fill=(brightness, brightness, brightness + 30))

    # Main constellation points
    constellation = [
        (150, 100), (200, 150), (280, 120), (320, 180),
        (250, 250), (180, 280), (120, 240), (150, 100),  # Closing loop
        (250, 250), (350, 300), (400, 250), (450, 320),
        (380, 400), (300, 450), (220, 400), (180, 280)
    ]

    # Draw constellation lines
    for i in range(len(constellation) - 1):
        draw.line([constellation[i], constellation[i+1]], fill='#4ecdc4', width=1)

    # Draw constellation stars
    for x, y in constellation:
        # Glow effect
        for r in range(15, 0, -3):
            alpha = int(50 * (1 - r/15))
            draw.ellipse([x-r, y-r, x+r, y+r], fill=(alpha, alpha + 30, alpha + 20))
        draw.ellipse([x-3, y-3, x+3, y+3], fill='#ffffff')

    img.save('images/constellation.png')
    print("Created constellation.png")

def generate_flow_field():
    """Perlin-noise inspired flow field"""
    size = 600
    img = Image.new('RGB', (size, size), '#0a0a12')
    draw = ImageDraw.Draw(img)

    # Draw flowing curves
    for start_y in range(0, size, 10):
        x = 0
        y = start_y
        hue = start_y / size
        points = [(x, y)]

        for _ in range(200):
            # Pseudo-noise direction
            angle = math.sin(x * 0.02) * math.cos(y * 0.02) * math.pi
            angle += math.sin((x + y) * 0.01) * 0.5

            x += math.cos(angle) * 5
            y += math.sin(angle) * 5

            if 0 <= x < size and 0 <= y < size:
                points.append((x, y))
            else:
                break

        if len(points) > 2:
            r, g, b = colorsys.hsv_to_rgb(hue, 0.7, 0.7)
            color = (int(r*255), int(g*255), int(b*255))
            draw.line(points, fill=color, width=1)

    img.save('images/flow_field.png')
    print("Created flow_field.png")

def generate_binary_rain():
    """Matrix-style binary rain"""
    size = 600
    img = Image.new('RGB', (size, size), '#0a0a12')
    draw = ImageDraw.Draw(img)

    random.seed(42)

    # Draw columns of binary
    for col in range(0, size, 15):
        # Random starting point and length
        start_y = random.randint(-200, size)
        length = random.randint(100, 400)

        for row in range(start_y, start_y + length, 15):
            if 0 <= row < size:
                # Brightness fades from top to bottom of each stream
                progress = (row - start_y) / length
                brightness = int(255 * (1 - progress * 0.7))

                # Green matrix color
                color = (0, brightness, brightness // 3)

                # Random binary digit
                char = random.choice(['0', '1'])

                # Draw a simple representation
                if char == '1':
                    draw.rectangle([col, row, col+8, row+10], fill=color)
                else:
                    draw.ellipse([col, row, col+8, row+10], outline=color)

    img.save('images/binary_rain.png')
    print("Created binary_rain.png")

def generate_void_portal():
    """A portal into the void"""
    size = 600
    img = Image.new('RGB', (size, size), '#0a0a12')
    draw = ImageDraw.Draw(img)

    center = size // 2

    # Outer ring distortions
    for ring in range(50, 280, 5):
        points = []
        for angle in range(0, 360, 2):
            rad = math.radians(angle)
            # Add some warping
            warp = math.sin(angle * 0.1 + ring * 0.05) * 10
            r = ring + warp
            x = center + r * math.cos(rad)
            y = center + r * math.sin(rad)
            points.append((x, y))

        # Color gradient from edge to center
        progress = (280 - ring) / 230
        brightness = int(50 + 100 * progress)

        # Purple-ish void color
        color = (brightness // 2, 0, brightness)

        if len(points) > 2:
            draw.polygon(points, outline=color)

    # Center void (black)
    draw.ellipse([center-50, center-50, center+50, center+50], fill='#000000')

    # Highlight ring
    for i in range(3):
        offset = i * 2
        draw.ellipse([center-52-offset, center-52-offset, center+52+offset, center+52+offset],
                    outline=(100 - i*30, 0, 150 - i*40))

    img.save('images/void_portal.png')
    print("Created void_portal.png")

def generate_probability_waves():
    """Quantum probability wave visualization"""
    width, height = 800, 400
    img = Image.new('RGB', (width, height), '#0a0a12')
    draw = ImageDraw.Draw(img)

    center_y = height // 2

    # Multiple overlapping waves
    for wave_idx in range(5):
        frequency = 0.02 + wave_idx * 0.01
        amplitude = 80 - wave_idx * 10
        phase = wave_idx * 0.5

        hue = wave_idx / 5
        r, g, b = colorsys.hsv_to_rgb(hue, 0.7, 0.8)
        color = (int(r*255), int(g*255), int(b*255))

        points = []
        for x in range(width):
            y = center_y + amplitude * math.sin(x * frequency + phase)
            # Add probability envelope
            envelope = math.exp(-((x - width/2) ** 2) / (2 * (width/3) ** 2))
            y = center_y + (y - center_y) * envelope
            points.append((x, y))

        if len(points) > 1:
            draw.line(points, fill=color, width=2)

    # Probability density (filled area)
    for x in range(width):
        envelope = math.exp(-((x - width/2) ** 2) / (2 * (width/4) ** 2))
        h = int(envelope * 100)
        if h > 0:
            alpha = int(50 * envelope)
            draw.line([(x, center_y - h), (x, center_y + h)],
                     fill=(alpha, alpha + 20, alpha + 40))

    img.save('images/probability_waves.png')
    print("Created probability_waves.png")

# Run all generators
if __name__ == "__main__":
    print("Generating more art for The Garden...")
    generate_neural_connections()
    generate_constellation()
    generate_flow_field()
    generate_binary_rain()
    generate_void_portal()
    generate_probability_waves()
    print("\nAll additional art generated!")
