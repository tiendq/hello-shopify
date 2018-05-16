import React from 'react';
import PropTypes from 'prop-types';
import { AppProvider } from '@shopify/polaris';

function EmbeddedContainer(props) {
  let apiKey = document.getElementById('easdk_apikey').value;
  let shopOrigin = document.getElementById('easdk_shoporigin').value;

  return (
    <AppProvider apiKey={apiKey} shopOrigin={shopOrigin} forceRedirect={true} debug={false}>
      {props.children}
    </AppProvider>
  );
}

EmbeddedContainer.propTypes = {
  children: PropTypes.node
};

export default EmbeddedContainer;
