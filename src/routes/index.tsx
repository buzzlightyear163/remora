import { createBrowserRouter, Outlet } from 'react-router-dom';
import { SiteLayout } from '../layouts/SiteLayout';
import Home from '../pages/Home';
import NotFound from '../pages/NotFound';

// Route inventory of the reference: a single public route "/" (sections are in-page anchors #hero #pod #mirror #how).
export const router = createBrowserRouter([
  {
    element: (
      <SiteLayout>
        <Outlet />
      </SiteLayout>
    ),
    children: [
      { path: '/', element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
