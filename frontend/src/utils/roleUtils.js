/**
 * @file roleUtils.js
 * @author Paola Bustos, Simon Tenedero, Yevheniia Bazhmaieva
 * @created 2025-06-18
 * @lastModified 2025-06-30
 * @desc module for managing roles
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { fetchUserInfo } from './usersUtils';
import { getAuth } from 'firebase/auth';

/*
const EXTRA_AVAILABLE_FEATURES = {
  // Chat Features
  YOUTUBE_CHAT: 'youtube_chat',
  NATIVE_CHAT: 'native_chat',
  PRIVATE_CHAT: 'private_chat',

  // Messaging Features  
  SEND_MESSAGES: 'send_messages',
  DELETE_MESSAGES: 'delete_messages',
  ADD_REACTIONS: 'add_reactions',

  // Private Chat Features
  CREATE_PRIVATE_CHATS: 'create_private_chats',
  JOIN_PRIVATE_CHATS: 'join_private_chats',
  INVITE_USERS: 'invite_users',

  // Admin Features
  ADMIN_PANEL: 'admin_panel',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_USERS: 'manage_users',

  // Moderation Features
  MODERATE_CHATS: 'moderate_chats',
  MUTE_USERS: 'mute_users',
  VIEW_USER_PROFILES: 'view_user_profiles'
};*/

export const AVAILABLE_FEATURES = {
  // Chat Features
  ARCHIVE_CHAT: 'archive_chat',
  YOUTUBE_CHAT: 'youtube_chat',
  NATIVE_CHAT: 'native_chat',
  PRIVATE_CHAT: 'private_chat',
  ADMIN_PANEL: 'admin_panel',
};

/**
 * Create a new role.
 *
 * @param {Object} roleData - Role data {description, features}. This will be created from the data inputted in a form from the frontend admin panel
 *
 * @returns {Promise<string>} - Created role ID
 */
export const createRole = async (roleData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  const adminUid = currentUser.uid;

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== 'admin') {
    throw new Error(
      'failed to create role, user does not have admin permissions'
    );
  }

  //use the keys() function from the Object class to retrieve the keys from the roleData.features map
  const roleFeatures = Object.keys(roleData.features).sort();
  const availableFeatures = Object.values(AVAILABLE_FEATURES).sort();

  //roleData features must have a key-val pair for every specified feature.
  const validFeatures =
    roleFeatures.length === availableFeatures.length &&
    roleFeatures.every((key, index) => key === availableFeatures[index]); //.every() tests whether all elements in an array satisfy a provided condition - returns true/false, versus .forEach() applies function to all elems, and returns undefined.

  if (!validFeatures) {
    throw new Error(
      'roleData features must have a key-val pair for every specified feature in features.js'
    );
  }

  try {
    /*
    NOTE: roleData.features is a map of key-val pairs
    {
      admin_panel:true,
      native_chat:true,
      etc.
    }
    */

    //when added to the firebase, a unique id will automatically be created
    const newRole = {
      roleName: roleData.roleName,
      description: roleData.description || 'description not provided',
      features: roleData.features,
      creationInfo: {
        createdBy: adminUid, //record admin uid who created this role
        createdAt: serverTimestamp(),
      },
      updateInfo: [], //store array of updates, will be an array of objects saying timestamp, by who, and description of update.
      deletionInfo: null,
      members: [], //store array of userIDs with this role
    };

    //addDoc() returns a reference to the created document - requires a collection reference, not document reference
    const roleId = await addDoc(collection(db, 'roles'), newRole);
    console.log(
      `Role '${roleData.roleName}' with ID '${roleId}' created successfully`
    );
  } catch (error) {
    throw new Error('error creating new role');
  }
};

/**
 * Update an existing role, change its features, description and name. members can be changed through assignUserToRole()
 *
 * @param {string} roleId - ID of role to update
 * @param {Object} newRoleData - New role data {roleName, description, features}. This will be created from the data inputted in a form from the frontend admin panel
 *
 * @returns {Promise<void>} - Resolves when the role is updated successfully
 */
export const updateRole = async (roleId, newRoleData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  const adminUid = currentUser.uid;

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== 'admin') {
    throw new Error(
      'failed to update role, user does not have admin permissions'
    );
  }

  //check role we are updating exists
  const roleRef = doc(db, 'roles', roleId);
  const roleSnap = await getDoc(roleRef);

  if (!roleSnap.exists()) {
    throw new Error('cannot update role, role does not exist');
  } else {
    console.log('role exists!');
  }

  //use the keys() function form the Object class to retrieve the keys from the roleData.features map
  const newRoleFeatures = Object.keys(newRoleData.features).sort();
  const availableFeatures = Object.values(AVAILABLE_FEATURES).sort();

  //roleData features must have a key-val pair for every specified feature.
  const validFeatures =
    newRoleFeatures.length === availableFeatures.length &&
    newRoleFeatures.every((key, index) => key === availableFeatures[index]);

  if (!validFeatures) {
    throw new Error(
      'roleFeatures must have a key-val pair for every specified feature in features.js'
    );
  }

  try {
    console.log('hi we are trying...');

    const roleData = roleSnap.data();
    const prevUpdateInfo = roleData.updateInfo || [];

    console.log('roleData=', roleData);

    //only need to update user docs if the roleName changed.
    if (newRoleData.roleName !== roleData.roleName) {
      const members = roleData.members;

      //update role name for user documents
      await Promise.all(
        members.map(async (member) => {
          try {
            const memberRef = doc(db, 'users', member.userId);
            const memberSnap = await getDoc(memberRef);

            if (!memberSnap.exists()) {
              throw new Error('member does not exist');
            }

            //update rolename
            await updateDoc(memberRef, {
              role: {
                roleId: roleId,
                roleName: newRoleData.roleName,
                assignedBy: adminUid,
                assignedAt: serverTimestamp(),
                removedAt: null,
                removedBy: null,
              },
            });
          } catch (e) {
            console.error(`could not process member ${member.displayName}:`, e);
          }
        })
      );
    }

    const dummyRef = doc(db, '_utils', 'timestampResolver'); // Create a dummy doc in a safe collection
    await setDoc(dummyRef, { now: serverTimestamp() });
    const resolved = await getDoc(dummyRef);
    const serverTime = resolved.data().now;

    //update role doc
    await updateDoc(roleRef, {
      ...newRoleData,
      updateInfo: [
        ...prevUpdateInfo,
        {
          stateBeforeUpdate: {
            roleName: roleData.roleName,
            description: roleData.description,
            features: roleData.features,
          },
          updatedBy: adminUid,
          updatedAt: serverTime,
        },
      ],
    });

    console.log(
      `Role '${newRoleData.roleName}' with ID:'${roleId}' updated successfully`
    );

    // Note: In a real app, you might want to trigger a refresh
    // for users with this role to get updated permissions
  } catch (error) {
    //updateDoc() will throw an error if updating a doc that does not exist
    throw new Error(`failed to update ${roleId}: ${error.message}`);
  }
};

/**
 * Delete a role (moves users to 'unrecognized')
 *
 * @param {string} roleId - ID of role to delete
 *
 * @returns {Promise<void>} - Resolves when the role is deleted successfully
 */
export const deleteRole = async (roleId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  const adminUid = currentUser.uid;

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== 'admin') {
    throw new Error(
      'failed to delete role, user does not have admin permissions'
    );
  }

  try {
    //create reference to role we will delete
    const deleteRole = await getDoc(doc(db, 'roles', roleId));

    if (!deleteRole.exists()) {
      throw new Error(`provided roleId ${roleId} does not exist`);
    }

    //fetch member uids, so we can re-assign them to 'unrecognized'
    const members = deleteRole.data().members;

    //create reference to unrecognized role
    const q = query(
      collection(db, 'roles'),
      where('roleName', '==', 'unrecognized')
    );
    const unrecognizedSnap = await getDocs(q);

    if (unrecognizedSnap.empty) {
      throw new Error(`could not retrieve role 'unrecognized'`);
    }

    const unrecognizedRole = unrecognizedSnap.docs[0];

    const unrecognizedMembers = unrecognizedRole.data().members;

    const dummyRef = doc(db, '_utils', 'timestampResolver'); // Create a dummy doc in a safe collection
    await setDoc(dummyRef, { now: serverTimestamp() });
    const resolved = await getDoc(dummyRef);
    const serverTime = resolved.data().now;

    //copy members of role we will delete into unrecognized role and update their roles in the firebase
    await Promise.all(
      members.map(async (member) => {
        try {
          const memberRef = doc(db, 'users', member.userId);
          const memberSnap = await getDoc(memberRef);

          if (!memberSnap.exists()) {
            throw new Error('member does not exist');
          }

          await updateDoc(memberRef, {
            //using spread operator here '...' to append new object to end
            previousRoles: [
              ...(memberSnap.data().previousRoles || []),
              {
                roleId: memberSnap.data().role.roleId,
                roleName: memberSnap.data().role.roleName,
                assignedBy: memberSnap.data().role.assignedBy,
                assignedAt: memberSnap.data().role.assignedAt,
                removedAt: serverTime,
                removedBy: adminUid,
              },
            ],
            //not how previousRoles is updated first using the old role, before we update role - that's why in this case, order of fields updating matters
            role: {
              roleId: unrecognizedRole.id,
              roleName: 'unrecognized',
              assignedBy: adminUid,
              assignedAt: serverTime,
              removedAt: null,
              removedBy: null,
            },
          });

          unrecognizedMembers.push(member);
        } catch (e) {
          console.error(`could not process member ${member.displayName}:`, e);
        }
      })
    );

    //update unrecognized members
    await updateDoc(doc(db, 'roles', unrecognizedSnap.docs[0].id), {
      members: unrecognizedMembers,
    });

    const deleteRoleData = deleteRole.data();

    //set deletion Info
    deleteRoleData.deletionInfo = {
      deletedAt: serverTime,
      deletedBy: adminUid,
    };

    //move deleted role to deletedRoles collection
    await addDoc(collection(db, 'deletedRoles'), {
      prevId: roleId,
      ...deleteRoleData,
    });

    //delete document from roles collection
    await deleteDoc(doc(db, 'roles', roleId));

    console.log(`Role '${roleId}' deleted successfully`);

    //delete document from roles collection
    await deleteDoc(doc(db, 'roles', roleId));

    console.log(`Role '${roleId}' deleted successfully`);
  } catch (error) {
    console.error('Error deleting role:', error);
    throw error;
  }
};

/**
 * Get all roles - used to retrieve all roles for later displaying on admin page (will be recalled to reflect any changes made to number of roles)
 *
 * @returns {Promise<Array>} - Array of all roles
 */
export const getAllRoles = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== 'admin') {
    throw new Error(
      'failed to create role, user does not have admin permissions'
    );
  }

  try {
    const rolesSnapshot = await getDocs(collection(db, 'roles'));

    const roles = rolesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Retrieved ${roles.length} roles`);
    return roles;
  } catch (error) {
    console.error('Error getting roles:', error);
    throw error;
  }
};

/**
 * Get a specific role by ID
 *
 * @param {string} roleId - ID of role to get
 *
 * @returns {Promise<Object|null>} - Role data or null if not found
 */
export const getRole = async (roleId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== 'admin') {
    throw new Error(
      'failed to retrieve role, user does not have admin permissions'
    );
  }

  try {
    const roleDoc = await getDoc(doc(db, 'roles', roleId));

    if (roleDoc.exists()) {
      console.log('hey its = ', roleId);
      console.log('mydata=', roleDoc.data());
      return { id: roleDoc.id, ...roleDoc.data() };
    } else {
      console.warn(`Role '${roleId}' not found`);
      return null;
    }
  } catch (error) {
    console.error('Error getting role:', error);
    throw error;
  }
};

/**
 * Assign a user to a specific role - this is used if we are moving a user between roles (drag and drop between lists on admin page)
 *
 * @param {string} userId - ID of user to assign
 * @param {string} destRoleId - ID of role to assign to
 *
 * @returns {Promise<void>} - Resolves when the user is assigned to the role successfully
 */
export const assignUserToRole = async (userId, destRoleId) => {
  //have to move between previousMembers and members of the role

  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  const adminUid = currentUser.uid;

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const adminData = await fetchUserInfo(currentUser.uid);

  if (adminData.role.roleName !== 'admin') {
    throw new Error(
      'failed to assign user to role, user does not have admin permissions'
    );
  }

  try {
    //verify src role exists for user we are assigning
    const user = await fetchUserInfo(userId);

    console.log('srcRole=', user.role.roleId);

    const srcRole = await getRole(user.role.roleId);
    if (!srcRole) {
      throw new Error(`Role '${srcRole.roleName}' does not exist`);
    }

    //verify destination role exists
    const destRole = await getRole(destRoleId);
    if (!destRole) {
      throw new Error(`Role '${destRole.roleName}' does not exist`);
    }

    //make sure that you cant duplicate roles
    if (srcRole.roleName === destRole.roleName) {
      return;
    }

    //remove member from srcRole
    const newSrcRoleMembers = srcRole.members.filter(
      (member) => member.userId !== userId
    );

    await updateDoc(doc(db, 'roles', user.role.roleId), {
      members: newSrcRoleMembers,
    });

    //append member to end of destRole
    const newDestRoleMembers = [
      ...(destRole.members || []),
      {
        userId: userId,
        displayName: user.displayName || 'anonymous',
        photoUrl: user.photoUrl || null,
      },
    ];
    await updateDoc(doc(db, 'roles', destRoleId), {
      members: newDestRoleMembers,
    });

    const userRef = doc(db, 'users', userId); //create user reference

    const dummyRef = doc(db, '_utils', 'timestampResolver'); // Create a dummy doc in a safe collection
    await setDoc(dummyRef, { now: serverTimestamp() });
    const resolved = await getDoc(dummyRef);
    const serverTime = resolved.data().now;

    //update user role information
    await updateDoc(userRef, {
      previousRoles: [
        ...(user.previousRoles || []),
        {
          roleId: user.role.roleId,
          roleName: user.role.roleName,
          assignedBy: user.role.assignedBy,
          assignedAt: user.role.assignedAt,
          removedAt: serverTime,
          removedBy: adminUid,
        },
      ],
      role: {
        roleId: destRoleId,
        roleName: destRole.roleName,
        assignedBy: adminUid,
        assignedAt: serverTime,
        removedAt: null,
        removedBy: null,
      },
    });

    console.log(`User '${userId}' assigned to role '${destRole.roleName}'`);
  } catch (error) {
    console.error('Error assigning user to role:', error);
    throw error;
  }
};

/**
 * Get all users with a specific role
 *
 * @param {string} roleId - ID of role to search for
 *
 * @returns {Promise<Array>} - Array of objects with {username, userId, photoUrl}
 */
export const getUsersByRole = async (roleId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== 'admin') {
    throw new Error(
      'failed to create role, user does not have admin permissions'
    );
  }

  try {
    const roleSnap = await getDoc(doc(db, 'roles', roleId));

    if (!roleSnap.exists()) {
      throw new Error('given roleId does not exist, cannot get all users');
    }

    const roleData = roleSnap.data();

    const members = roleData.members;

    return members;
  } catch (error) {
    console.error('Error getting users by role:', error);
    throw error;
  }
};

/**
 * Get permissions for a specific user
 *
 * @param {string} userId - ID of user to get permissions for
 *
 * @returns {Promise<Object>} - Object with user permissions
 */
export const getUserPermissions = async (userId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleId !== 'admin') {
    throw new Error(
      'failed to create role, user does not have admin permissions'
    );
  }

  try {
    if (!userId) {
      // Not logged in - only YouTube chat
      return getDefaultPermissions();
    }

    // Get user data
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      // User not in system - unrecognized permissions
      return getDefaultPermissions();
    }

    const userData = userDoc.data();
    const roleId = userData.role || 'unrecognized';

    // Get role permissions
    const rolePermissions = await getRolePermissions(roleId);

    // TODO: Add individual user overrides here if implemented later
    const userOverrides = userData.featureOverrides || {};
    const finalPermissions = { ...rolePermissions, ...userOverrides };

    return {
      ...finalPermissions,
      userRole: roleId,
      roleAssignedAt: userData.roleAssignedAt,
      roleAssignedBy: userData.roleAssignedBy,
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    // Return safe default permissions on error
    return getDefaultPermissions();
  }
};

/**
 * Get permissions for a specific role.
 *
 * @param {string} roleId - ID of role to get permissions for
 *
 * @returns {Promise<Object>} - Object with role permissions
 */
export const getRolePermissions = async (roleId) => {
  //if not admin or roleId doesn't match currentUser.uid
  try {
    if (roleId === 'unrecognized') {
      return getDefaultPermissions();
    }

    const role = await getRole(roleId);
    if (!role) {
      console.warn(`Role '${roleId}' not found, using default permissions`);
      return getDefaultPermissions();
    }

    return role.features || {};
  } catch (error) {
    console.error('Error getting role permissions:', error);
    return getDefaultPermissions();
  }
};

/**
 * assign self to unrecognized at account creation.
 * NOTE: this is meant to be only called once when a user makes their account for the first time.
 *
 * @returns {Promise<void>} - Resolves when the user is assigned to the unrecognized role successfully
 */
export const assignSelfToUnrecognized = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('user not authenticated.');
  }

  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));

  if (!userSnap.exists()) {
    throw new Error('user does not exist');
  }

  //create reference to unrecognized role
  const q = query(
    collection(db, 'roles'),
    where('roleName', '==', 'unrecognized')
  );
  const unrecognizedSnap = await getDocs(q);

  if (unrecognizedSnap.empty) {
    throw new Error(`could not retrieve role 'unrecognized'`);
  }

  const unrecognizedRole = unrecognizedSnap.docs[0];

  let unrecognizedMembers = unrecognizedRole.data().members;

  const dummyRef = doc(db, '_utils', 'timestampResolver'); // Create a dummy doc in a safe collection
  await setDoc(dummyRef, { now: serverTimestamp() });
  const resolved = await getDoc(dummyRef);
  const serverTime = resolved.data().now;

  await updateDoc(doc(db, 'users', currentUser.uid), {
    role: {
      roleId: unrecognizedRole.id,
      roleName: 'unrecognized',
      assignedBy: 'assignSelfToUnrecognized() on account creation',
      assignedAt: serverTime,
      removedAt: null,
      removedBy: null,
    },
  });

  //add members, dont do unrecognizedMembers = unrecognizedMembers ... this returns an integer
  unrecognizedMembers.push({
    userId: currentUser.uid,
    displayName: currentUser.displayName || 'anonymous',
    photoUrl: currentUser.photoUrl || null,
  });

  await updateDoc(doc(db, 'roles', unrecognizedRole.id), {
    members: unrecognizedMembers,
  });
};

/**
 * Get permissions for the current logged-in user (for internal app use)
 * No admin verification required - anyone can check their own permissions
 *
 * @returns {Promise<Object>} - Object with current user permissions
 */
export const getMyOwnPermissions = async () => {
  try {
    console.log('getMyOwnPermissions() called!');

    const auth = getAuth();
    const currentUser = auth.currentUser;

    //user doesn't exist, return default permissions
    if (!currentUser) {
      console.log('returning default permissions...');
      return getDefaultPermissions();
    }

    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

    if (!userDoc.exists()) {
      console.log('userDoc does not exist.');
      return getDefaultPermissions();
    }

    console.log('userDoc Exists');

    const userData = userDoc.data();
    const roleName = userData.role?.roleName;

    if (!roleName) {
      console.log('userDoc does not have a roleName entry in role field');
      return getDefaultPermissions();
    }

    console.log('rolename=', roleName);

    const q = query(collection(db, 'roles'), where('roleName', '==', roleName));
    const multipleRoleSnap = await getDocs(q);

    //role attached to user does not exist, return default permissions
    if (multipleRoleSnap.empty) {
      console.error('role does not exist, cannot retrieve permissions');
      return getDefaultPermissions();
    }

    //retrieve data corresponding to role
    const roleSnap = multipleRoleSnap.docs[0];
    const roleData = roleSnap.data();

    //return permissions of role
    const mappedPermissions = {
      //TODO: make dynamically adapt from available features, instead of manually listing these one by one
      [AVAILABLE_FEATURES.ARCHIVE_CHAT]:
        roleData.features?.youtube_chat || false,
      [AVAILABLE_FEATURES.YOUTUBE_CHAT]:
        roleData.features?.youtube_chat || false,
      [AVAILABLE_FEATURES.NATIVE_CHAT]: roleData.features?.native_chat || false,
      [AVAILABLE_FEATURES.PRIVATE_CHAT]:
        roleData.features?.private_chat || false,
      [AVAILABLE_FEATURES.ADMIN_PANEL]: roleData.features?.admin_panel || false,
    };

    return mappedPermissions;
  } catch (error) {
    console.error('Error getting my own permissions:', error);
    return getDefaultPermissions();
  }
};

/**
 * Get default permissions for unrecognized users
 *
 * @returns {Object} - Default permissions object
 */
const getDefaultPermissions = () => {
  return {
    [AVAILABLE_FEATURES.ARCHIVE_CHAT]: false,
    [AVAILABLE_FEATURES.YOUTUBE_CHAT]: true,
    [AVAILABLE_FEATURES.NATIVE_CHAT]: false,
    [AVAILABLE_FEATURES.PRIVATE_CHAT]: false,
    [AVAILABLE_FEATURES.ADMIN_PANEL]: false,

    /*
      [AVAILABLE_FEATURES.MANAGE_ROLES]: roleData.accessAdminPanel || false,
      [AVAILABLE_FEATURES.MANAGE_USERS]: roleData.accessAdminPanel || false,
      [AVAILABLE_FEATURES.SEND_MESSAGES]: roleData.accessNativeChat || false,
      [AVAILABLE_FEATURES.DELETE_MESSAGES]: roleData.accessAdminPanel || false,
      [AVAILABLE_FEATURES.ADD_REACTIONS]: roleData.accessNativeChat || false,
      [AVAILABLE_FEATURES.CREATE_PRIVATE_CHATS]: roleData.accessPrivateChat || false,
      [AVAILABLE_FEATURES.JOIN_PRIVATE_CHATS]: roleData.accessPrivateChat || false,
      [AVAILABLE_FEATURES.INVITE_USERS]: roleData.accessPrivateChat || false,
      */
  };
};
