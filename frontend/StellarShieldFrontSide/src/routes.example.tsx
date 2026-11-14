import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const InteractiveAnatomy = lazy(() => import('./pages/InteractiveAnatomy'));

const router = createBrowserRouter([
  {
    path: '/health-monitoring/anatomy',
    element: (
      <Suspense fallback={null}>
        <InteractiveAnatomy />
      </Suspense>
    ),
  },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}

/*
  Existing <Routes> setup (react-router-dom v6/v7):

    import { Route } from 'react-router-dom';
    <Route path="/health-monitoring/anatomy" element={<InteractiveAnatomy />} />

  Sidebar link:

    import { NavLink } from 'react-router-dom';
    <NavLink to="/health-monitoring/anatomy">Interactive Anatomy</NavLink>
*/