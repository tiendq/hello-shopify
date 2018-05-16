import React from 'react';
import { render } from 'react-dom';
import { Page, TextContainer } from '@shopify/polaris';
import EmbeddedContainer from './embedded-container';

window.onload = function () {
  render(
    <EmbeddedContainer>
      <Page title="Home" fullWidth>
        <TextContainer>
          <p>A working sample Shopify app built with Polaris and Node.JS</p>
        </TextContainer>
      </Page>
    </EmbeddedContainer>,
    document.getElementById('root')
  );
}
