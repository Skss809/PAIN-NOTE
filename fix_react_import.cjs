const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');
content = content.replace("import React from 'react';\nconst SortableNote:", "const SortableNote:"); // remove previous
content = content.replace("import { useState, FormEvent, ChangeEvent, useRef } from 'react';", "import React, { useState, FormEvent, ChangeEvent, useRef } from 'react';");
fs.writeFileSync('src/components/Notepad.tsx', content);
