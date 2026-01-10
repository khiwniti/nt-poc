import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe } from './axe-helper';
import { BrowserRouter } from 'react-router-dom';

// Example accessibility test for a component
// This file serves as a template and reference for writing accessibility tests

describe('Component Accessibility Tests', () => {
  // Template test - should be copied and adapted for specific components
  it.skip('Example: Component should not have accessibility violations', async () => {
    const ExampleComponent = () => (
      <div>
        <h1>Example Heading</h1>
        <button aria-label="Example button">Click me</button>
        <img src="test.jpg" alt="Test image" />
      </div>
    );

    const { container } = render(
      <BrowserRouter>
        <ExampleComponent />
      </BrowserRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Document should have proper structure', async () => {
    const { container } = render(
      <div role="main">
        <h1>Test Page</h1>
        <p>Content goes here</p>
      </div>
    );

    const results = await axe(container, {
      rules: {
        // Test specific WCAG 2.1 AA rules
        region: { enabled: true },
        'page-has-heading-one': { enabled: true },
        'landmark-one-main': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('Buttons should have accessible names', async () => {
    const { container } = render(
      <div>
        <button aria-label="Submit form">Submit</button>
        <button>Cancel</button>
      </div>
    );

    const results = await axe(container, {
      rules: {
        'button-name': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('Images should have alt text', async () => {
    const { container } = render(
      <div>
        <img src="logo.png" alt="Company logo" />
        <img src="decorative.png" alt="" role="presentation" />
      </div>
    );

    const results = await axe(container, {
      rules: {
        'image-alt': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('Form inputs should have labels', async () => {
    const { container } = render(
      <form>
        <label htmlFor="name">Name:</label>
        <input id="name" type="text" />
        
        <input type="email" aria-label="Email address" />
      </form>
    );

    const results = await axe(container, {
      rules: {
        label: { enabled: true },
        'aria-input-field-name': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('Links should have accessible names', async () => {
    const { container } = render(
      <nav>
        <a href="/home">Home</a>
        <a href="/about" aria-label="About us">About</a>
      </nav>
    );

    const results = await axe(container, {
      rules: {
        'link-name': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('Color contrast should meet WCAG AA standards', async () => {
    const { container } = render(
      <div style={{ backgroundColor: '#ffffff', color: '#000000' }}>
        <p>This text has sufficient contrast</p>
      </div>
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });
});
