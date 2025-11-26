/**
 * @file useRolesData.js
 * @author Yevheniia Bazhmaieva, Paola Bustos, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description Custom hook to fetch and manage roles data for the admin panel.
 */

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const useRolesData = () => {
  const [loading, setLoading] = useState(true);
  const [rolesData, setRolesData] = useState({});
  const [columns, setColumns] = useState({});
  const [fixedColumns, setFixedColumns] = useState([]);
  const [draggableColumnOrder, setDraggableColumnOrder] = useState([]);

  const FIXED_COLUMN_IDS = ['admin', 'unrecognized'];

  //data fetching logic
  const fetchRolesFromFirestore = async () => {
    try {
      setLoading(true);
      const rolesSnapshot = await getDocs(collection(db, 'roles'));
      const rolesDataTemp = {};

      //populate map with data corresponding to each role
      rolesSnapshot.forEach((doc) => {
        const data = doc.data();
        rolesDataTemp[doc.id] = {
          //use doc.id from firebase as the key
          id: doc.id,
          roleName: data.roleName,
          description: data.description || '',
          features: data.features || {}, //enabled features for the role ex. {ARCHIVE_CHAT: true, YOUTUBE_CHAT: true, etc. }
          members: data.members || [],
        };
      });

      setRolesData(rolesDataTemp);

      //create columns based on roles
      const result = {};
      const fixedCols = []; //array of fixed columns
      const draggableOrder = []; //array of draggable columns

      //map the values of the key-val pairs to columns
      Object.values(rolesDataTemp).forEach((role) => {
        const roleId = role.roleName || role.id;

        const columnData = {
          id: roleId,
          title:
            roleId.charAt(0).toUpperCase() +
            roleId.slice(1).replace(/([A-Z])/g, ' $1'), //roleName is stored as ARCHIVE_CHAT, YOUTUBE_CHAT, etc. so we are modifiying the casing and removing the '_'
          cards: [], //array of stored cards
        };

        //append members to the columnData
        role.members.forEach((member) => {
          columnData.cards.push({
            id: member.userId,
            content: member.displayName || 'anonymous',
            photoUrl: member.photoUrl || '',
          });
        });

        result[roleId] = columnData;

        //separate fixed and draggable columns
        if (FIXED_COLUMN_IDS.includes(roleId)) {
          fixedCols.push(roleId);
        } else {
          draggableOrder.push(roleId);
        }
      });

      setColumns(result);

      //sort fixed columns to ensure consistent order (admin first, then unrecognized)
      const sortedFixedCols = FIXED_COLUMN_IDS.filter((id) =>
        fixedCols.includes(id)
      );
      setFixedColumns(sortedFixedCols);
      setDraggableColumnOrder(draggableOrder);
    } catch (error) {
      console.error('Error fetching roles or users:', error);
    } finally {
      setLoading(false);
    }
  };

  //on mounting AdminPanelPage.js, we fetch the roles an initialize the state variables
  useEffect(() => {
    fetchRolesFromFirestore();
  }, []);

  return {
    loading,
    rolesData,
    columns,
    setColumns,
    fixedColumns,
    draggableColumnOrder,
    setDraggableColumnOrder,
    refetch: fetchRolesFromFirestore,
  };
};
