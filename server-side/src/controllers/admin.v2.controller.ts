import { Request, Response } from "express";
import { Student } from "../models/student.model";
import { Merch } from "../models/merch.model";
import { Orders } from "../models/orders.model";
import { studentService } from "../services/student.service";
import { adminService } from "../services/admin.service";
import { orderService } from "../services/order.service";
import { user_model } from "../model_template/model_data";
import { catchAsync } from "../util/catch.async.util";
import { account_status, membership_status } from "../enums/status.enums";
import { psits_roles } from "../enums/role.enums";
import { ICreateAdmin } from "../models/admin.interface";

class AdminController {
  getSearchStudentByIdController = catchAsync(
    async (req: Request, res: Response) => {
      const { id_number } = req.params;

      const student = await studentService.getSpecific(id_number);

      return res.status(200).json({ data: user_model(student) });
    }
  );

  getStudentCountController = catchAsync(
    async (req: Request, res: Response) => {
      const response = await studentService.count();

      res.status(200).json(response);
    }
  );

  getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const [
      dashboardCount,
      studentCount,
      merchCount,
      pendingCount,
      activeMembershipCount,
      dailySales,
    ] = await Promise.all([
      adminService.getAdminDashboardCount(),
      studentService.count(),
      Merch.countDocuments({
        is_active: true,
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() }
      }),
      Orders.countDocuments({ order_status: "Pending" }),
      Student.countDocuments({
        status: account_status.ACTIVE,
        membershipStatus: membership_status.ACTIVE,
      }),
      orderService.getDailySales(),
    ]);

    res.status(200).json({
      dashboardCount,
      studentCount,
      merchCount,
      pendingCount,
      activeMembershipCount,
      dailySales,
    });
  });

  getAllAdminController = catchAsync(async (req: Request, res: Response) => {
    const admins = await adminService.getAll(req);
    res.status(200).json({ data: admins });
  });
  getOrganizationTabCountsController = catchAsync(
    async (req: Request, res: Response) => {
      const counts = await adminService.getOrganizationTabCounts(
        req.admin?.access
      );
      res.status(200).json({ data: counts });
    }
  );
  getAllAdminMembersController = catchAsync(
    async (req: Request, res: Response) => {
      const admins = await adminService.getAllMembers();
      res.status(200).json({ data: admins });
    }
  );
  getAllSuspendAdminAccountController = catchAsync(
    async (req: Request, res: Response) => {
      const admins = await adminService.getAllSuspend();
      res.status(200).json({ data: admins });
    }
  );
  editAdminController = catchAsync(async (req: Request, res: Response) => {
    const result = await adminService.editAdmin(req);

    if (!result) {
      return res.status(400).json({ message: "Failed to edit admin account" });
    }
    return res
      .status(200)
      .json({ message: "Admin account edited successfully" });
  });
  changeAdminPasswordController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.changePassword(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res.status(200).json({ message: "Password changed successfully" });
    }
  );
  setSuspendAdminAccountController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.suspend(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin account suspended successfully" });
    }
  );
  setMemberRoleRemoveController = catchAsync(
    async (req: Request, res: Response) => {
      
      const result = await adminService.removeRole(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin account role updated successfully" });
    }
  );
  setRestoreAdminAccountController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.restore(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin account restored successfully" });
    }
  );
  setAdminRequestRoleController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.requestRole(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin role request submitted successfully" });
    }
  );

  getAllRequestMemberRoleController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.getAllMemberRequest();
      if (!result) {
        return res.status(400).json({ message: "Failed to get role requests" });
      }
      return res.status(200).json({ data: result });
    }
  );
  getAllRequestAdminAccountController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.getAllAdminRequest();
      if (!result) {
        return res
          .status(400)
          .json({ message: "Failed to get admin requests" });
      }
      return res.status(200).json({ data: result });
    }
  );
  approveRoleMemberController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.approveMember(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Role request approved successfully" });
    }
  );
  setDeclineMemberRoleController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.declineMember(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Role request declined successfully" });
    }
  );
  addNewAdminAccountController = catchAsync(
    async (req: Request, res: Response) => {
      const body: ICreateAdmin = req.body;
      const result = await adminService.create(body, req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin account created successfully" });
    }
  );
  approveAdminAccountController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.approveAdmin(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin account approved successfully" });
    }
  );
  declineAdminAccountController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await adminService.declineAdmin(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin account declined successfully" });
    }
  );
  setNewAdminAccessController = catchAsync(
    async (req: Request, res: Response) => {
      const { id_number, newAccess } = req.body;
      const normalized = Array.isArray(newAccess) ? newAccess[0] : newAccess;
      if (
        req.admin &&
        id_number === req.admin.id_number &&
        normalized !== psits_roles.ADMIN
      ) {
        return res.status(403).json({ message: "Cannot downgrade own access" });
      }
      const result = await adminService.changeAccess(req);
      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      return res
        .status(200)
        .json({ message: "Admin access updated successfully" });
    }
  );
}

export const adminController = new AdminController();
