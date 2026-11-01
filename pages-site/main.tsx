import React from 'react';
import {createRoot} from 'react-dom/client';
import '../app/mouvra.css';
import '../app/responsive.css';
import '../app/experience.css';
import {StoreProvider} from '../components/store';
import Storefront from '../components/Storefront';

createRoot(document.getElementById('root')!).render(<StoreProvider><Storefront/></StoreProvider>);
