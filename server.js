const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const jsonPath = path.join(__dirname, 'wishlist.json');

// Helper to read items from wishlist.json
function readItems() {
  try {
    if (!fs.existsSync(jsonPath)) {
      return [];
    }
    const data = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading wishlist.json:', error);
    return [];
  }
}

// Helper to write items to wishlist.json
function writeItems(items) {
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8');
    console.log('Successfully updated wishlist.json');
  } catch (error) {
    console.error('Error writing wishlist.json:', error);
  }
}

// API Endpoints

// GET all items
app.get('/api/items', (req, res) => {
  try {
    const items = readItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new item
app.post('/api/items', (req, res) => {
  const { id, name, url, image, price, note, category, subcategory, created_at } = req.body;
  
  if (!name || !url || !category) {
    return res.status(400).json({ error: 'Name, URL, and Category are required' });
  }

  try {
    const items = readItems();
    const timestamp = created_at || Date.now();
    const newItem = {
      id,
      name,
      url,
      image: image || null,
      price: price || null,
      note: note || null,
      category,
      subcategory: subcategory || null,
      created_at: timestamp,
      createdAt: timestamp
    };
    
    // Insert at the beginning since standard order is newest first
    items.unshift(newItem);
    writeItems(items);
    res.status(201).json({ id, message: 'Item added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH an item
app.patch('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  try {
    const items = readItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Prepare updated item
    const currentItem = items[index];
    const updatedItem = {
      ...currentItem,
      ...updates
    };

    // Keep fields synchronized
    if (updates.createdAt !== undefined) {
      updatedItem.created_at = updates.createdAt;
      updatedItem.createdAt = updates.createdAt;
    } else if (updates.created_at !== undefined) {
      updatedItem.created_at = updates.created_at;
      updatedItem.createdAt = updates.created_at;
    }

    items[index] = updatedItem;
    writeItems(items);
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE an item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  try {
    const items = readItems();
    const initialLength = items.length;
    const filtered = items.filter(item => item.id !== id);

    if (filtered.length === initialLength) {
      return res.status(404).json({ error: 'Item not found' });
    }

    writeItems(filtered);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
