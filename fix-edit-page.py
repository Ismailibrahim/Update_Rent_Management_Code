#!/usr/bin/env python3
import re

with open('frontend/src/app/properties/[id]/edit/page.tsx', 'r') as f:
    content = f.read()

# Fix the broken first catch block (around line 79)
pattern1 = r'if \(error && typeof error === \'object\' && \'response\' in error\) \{ const axiosError = error as \{ response\?: \{ status\?: number; data\?: \{ message\?: string; error\?: string \} \} \}; const error = axiosError; \{'
replacement1 = '''if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
        const status = axiosError.response?.status;
        responseStatus = status;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;'''

# Fix reference to axiosError at end
pattern2 = r'if \(axiosError\.response\?\.status === 404 \|\| axiosError\.response\?\.status === 403\)'
replacement2 = 'if (responseStatus === 404 || responseStatus === 403)'

content = re.sub(pattern1, replacement1, content)
content = re.sub(pattern2, replacement2, content)

# Add responseStatus declaration if missing
if 'let responseStatus: number | undefined;' not in content[:1000]:
    content = content.replace(
        'let errorMessage = \'Failed to fetch property details\';',
        '''let errorMessage = 'Failed to fetch property details';
      let responseStatus: number | undefined;'''
    )

# Fix the else if for request
content = content.replace(
    '} else if ((error && typeof error === \'object\' && \'request\' in error)) {',
    '} else if (error && typeof error === \'object\' && \'request\' in error) {'
)

# Fix the final else
content = content.replace(
    '''      } else {
        errorMessage = error.message || errorMessage;
      }''',
    '''      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }'''
)

with open('frontend/src/app/properties/[id]/edit/page.tsx', 'w') as f:
    f.write(content)

print("Fixed syntax errors")

