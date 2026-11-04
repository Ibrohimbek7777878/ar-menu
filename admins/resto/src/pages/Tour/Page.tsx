import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToursHome } from './ToursHome';
import { Workspace } from './Workspace';
import { tourIdFromSearch } from './urls';

/**
 * Sayr bo'limi (`/ra/tour`): ro'yxat; `?id=5` — shu sayr (yuklash, kutish yoki muharrir). Havola bilan ulashish va yangilash ishlaydi.
 * Muharrir `key={id}` bilan: boshqa sayrga o'tilganda holat tozalanadi.
 */
export const TourPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const id = tourIdFromSearch(location.search);

  if (id === null) return <ToursHome onOpen={(next) => navigate({ search: `?id=${next}` })} />;
  return <Workspace key={id} id={id} onBack={() => navigate({ search: '' })} />;
};

export default TourPage;
