/**
 * @file roleUtils.js
 * @author Paola Bustos, Simon Tenedero, Yevheniia Bazhmaieva
 * @created 2025-06-18
 * @lastModified 2025-06-30
 * @description module for managing roles
 */

import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { fetchUserInfo } from "./usersUtils";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

export const AVAILABLE_FEATURES = {
  // Chat Features (flags to use with hasFeature())
  ADMIN_PANEL: "admin_panel",

  ARCHIVE_CHAT: "archive_chat",

  YOUTUBE_CHAT: "youtube_chat",
  AI_SUMMARY: "AI_summary",

  NATIVE_CHAT: "native_chat",

  PRIVATE_CHAT: "private_chat",

  LIVESTREAM_PANEL: "livestream_panel",

  SETTINGS: "settings",

  PROFILE: "profile",

  /*
  CREATE_PRIVATE_CHAT: "create_private_chat",
  INVITATION_PANEL: "invitation_panel",
  */
};

/**
 * (calls cloud function in functions/index.js)
 * Assigns a user to the unrecognized role when they first create an account.
 *
 * @param {string} userId - ID of the user to assign
 * @param {string} roleId - ID of the role to assign to
 *
 * @returns {Promise<void>} - Resolves when the user is assigned to the unrecognized role successfully
 */
export const assignUserToRoleCloud = async (userId, roleId) => {
  try {
    //create a cloud functions instance

    const app = getApp();

    const functions = getFunctions(app, "us-central1"); //use the same region as your Firebase project

    //callable function reference
    const assignUserToRole = httpsCallable(functions, "assignUserToRole");
    //call function with relevant arguments

    const result = await assignUserToRole({
      userId: userId,
      destRoleId: roleId,
    });

    //handle success
    console.log("Success:", result.data.message);
  } catch (error) {
    console.error("Error:", error);
    //can isolate for specific errors too!!
    if (error.code === "functions/permission-denied") {
      alert("You do not have admin permissions.");
    } else if (error.code === "functions/unauthenticated") {
      alert("Please log in first.");
    } else {
      alert("Failed to update user role: " + error.message);
    }
  }
};

/**
 * Create a new role by calling the cloud function.
 *
 * @param {Object} roleData - Role data {roleName, description, features}. This will be created from the data inputted in a form from the frontend admin panel
 *
 * @returns {Promise<string>} - Created role ID
 */
export const createRoleCloud = async (roleData) => {
  try {
    // Create a cloud functions instance
    const app = getApp();

    console.log("createRoleCloud called!");
    const functions = getFunctions(app, "us-central1"); // use the same region as your Firebase project

    // Callable function reference
    const createRole = httpsCallable(functions, "createRole");

    // Call function with relevant arguments
    console.log("about to make cloud call to createRole");
    console.log("roleData=", roleData);

    const result = await createRole({
      roleName: roleData.roleName,
      description: roleData.description,
      features: roleData.features,
      AVAILABLE_FEATURES: AVAILABLE_FEATURES,
    });

    console.log("made it past cloud call.");

    // Handle success
    console.log("Success:", result.data.message);
    console.log(
      `Role '${roleData.roleName}' with ID '${result.data.roleId}' created successfully`,
    );

    // Return the role ID for consistency with the original function
    return result.data.roleId;
  } catch (error) {
    console.error("Error:", error);
    // Can isolate for specific errors too!!
    if (error.code === "functions/permission-denied") {
      alert("You do not have admin permissions.");
    } else if (error.code === "functions/unauthenticated") {
      alert("Please log in first.");
    } else if (error.code === "functions/invalid-argument") {
      alert("Invalid role data: " + error.message);
    } else {
      alert("Failed to create role: " + error.message);
    }
    throw error; // Re-throw to allow caller to handle if needed
  }
};

/**
 * Update a role by calling the cloud function.
 *
 * @param {string} roleId - ID of the role to update
 * @param {Object} newRoleData - New role data {roleName, description, features}
 *
 * @returns {Promise<string>} - Updated role ID
 */
export const updateRoleCloud = async (roleId, newRoleData) => {
  try {
    // Create a cloud functions instance
    const app = getApp();

    const functions = getFunctions(app, "us-central1"); // use the same region as your Firebase project

    // Callable function reference
    const updateRole = httpsCallable(functions, "updateRole");

    const result = await updateRole({
      roleId: roleId,
      newRoleData: newRoleData,
      AVAILABLE_FEATURES: AVAILABLE_FEATURES,
    });

    // Handle success
    console.log("Success:", result.data.message);
    console.log(
      `Role '${newRoleData.roleName}' with ID:'${roleId}' updated successfully`,
    );

    // Return the role ID for consistency with the original function
    return result.data.roleId;
  } catch (error) {
    console.error("Error:", error);
    // Can isolate for specific errors too!!
    if (error.code === "functions/permission-denied") {
      alert("You do not have admin permissions.");
    } else if (error.code === "functions/unauthenticated") {
      alert("Please log in first.");
    } else if (error.code === "functions/not-found") {
      alert("Role not found: " + error.message);
    } else if (error.code === "functions/invalid-argument") {
      alert("Invalid role data: " + error.message);
    } else {
      alert("Failed to update role: " + error.message);
    }
    throw error; // Re-throw to allow caller to handle if needed
  }
};

/**
 * Delete a role by calling the cloud function (moves users to 'unrecognized').
 *
 * @param {string} roleId - ID of role to delete
 *
 * @returns {Promise<void>} - Resolves when the role is deleted successfully
 */
export const deleteRoleCloud = async (roleId) => {
  try {
    // Create a cloud functions instance
    const app = getApp();

    const functions = getFunctions(app, "us-central1"); // use the same region as your Firebase project

    // Callable function reference
    const deleteRole = httpsCallable(functions, "deleteRole");

    const result = await deleteRole({
      roleId: roleId,
    });

    // Handle success
    console.log("Success:", result.data.message);
    console.log(`Role '${roleId}' deleted successfully`);

    // Return void for consistency with the original function
    return;
  } catch (error) {
    console.error("Error:", error);
    // Can isolate for specific errors too!!
    if (error.code === "functions/permission-denied") {
      alert("You do not have admin permissions.");
    } else if (error.code === "functions/unauthenticated") {
      alert("Please log in first.");
    } else if (error.code === "functions/not-found") {
      alert("Role not found: " + error.message);
    } else {
      alert("Failed to delete role: " + error.message);
    }
    throw error; // Re-throw to allow caller to handle if needed
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
    throw new Error("user not authenticated.");
  }

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== "admin") {
    throw new Error(
      "failed to create role, user does not have admin permissions",
    );
  }

  try {
    const rolesSnapshot = await getDocs(collection(db, "roles"));

    const roles = rolesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Retrieved ${roles.length} roles`);
    return roles;
  } catch (error) {
    console.error("Error getting roles:", error);
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
    throw new Error("user not authenticated.");
  }

  try {
    const roleDoc = await getDoc(doc(db, "roles", roleId));

    if (roleDoc.exists()) {
      return { id: roleDoc.id, ...roleDoc.data() };
    } else {
      console.warn(`Role '${roleId}' not found`);
      return null;
    }
  } catch (error) {
    console.error("Error getting role:", error);
    throw error;
  }
};

/**
 * Get all users with a specific role
 *
 * @param {string} roleId - ID of role to search for
 *
 * @returns {Promise<Array>} - Array of objects with {username, userId, photoURL}
 */
export const getUsersByRole = async (roleId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("user not authenticated.");
  }

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleName !== "admin") {
    throw new Error(
      "failed to create role, user does not have admin permissions",
    );
  }

  try {
    const roleSnap = await getDoc(doc(db, "roles", roleId));

    if (!roleSnap.exists()) {
      throw new Error("given roleId does not exist, cannot get all users");
    }

    const roleData = roleSnap.data();

    const members = roleData.members;

    return members;
  } catch (error) {
    console.error("Error getting users by role:", error);
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
    throw new Error("user not authenticated.");
  }

  //we should fetch the user info from the firebase instead of the user context in this case for security reasons. Users can modify the context value.
  const userData = await fetchUserInfo(currentUser.uid);

  if (userData.role.roleId !== "admin") {
    throw new Error(
      "failed to create role, user does not have admin permissions",
    );
  }

  try {
    if (!userId) {
      // Not logged in - only YouTube chat
      return getDefaultPermissions();
    }

    // Get user data
    const userDoc = await getDoc(doc(db, "users", userId));

    if (!userDoc.exists()) {
      // User not in system - unrecognized permissions
      return getDefaultPermissions();
    }

    const userData = userDoc.data();
    const roleId = userData.role || "unrecognized";

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
    console.error("Error getting user permissions:", error);
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
    if (roleId === "unrecognized") {
      return getDefaultPermissions();
    }

    const role = await getRole(roleId);

    if (!role) {
      console.warn(`Role '${roleId}' not found, using default permissions`);
      return getDefaultPermissions();
    }

    return role.features || {};
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return getDefaultPermissions();
  }
};

/**
 * Get permissions for the current logged-in user (for internal app use)
 * No admin verification required - anyone can check their own permissions
 *
 * @returns {Promise<Object>} - Object with current user permissions
 */
export const getMyOwnPermissions = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    //user doesn't exist, return default permissions
    if (!currentUser) {
      console.log("returning default permissions...");
      return getDefaultPermissions();
    }

    const userDoc = await getDoc(doc(db, "users", currentUser.uid));

    if (!userDoc.exists()) {
      console.log("userDoc does not exist.");
      return getDefaultPermissions();
    }

    //console.log("userDoc Exists");

    const userData = userDoc.data();
    const roleId = userData.role?.roleId;

    if (!roleId) {
      console.log("userDoc does not have a roleId entry");
      return getDefaultPermissions();
    }

    return getRolePermissions(roleId);
  } catch (error) {
    console.error("Error getting my own permissions:", error);
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
    [AVAILABLE_FEATURES.AI_SUMMARY]: false,
    [AVAILABLE_FEATURES.LIVESTREAM_PANEL]: true,
    [AVAILABLE_FEATURES.SETTINGS]: false,
    [AVAILABLE_FEATURES.PROFILE]: false,
  };
};
